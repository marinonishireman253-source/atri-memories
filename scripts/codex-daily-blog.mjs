import { createClient } from '@supabase/supabase-js';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const shanghaiTimeZone = 'Asia/Shanghai';
const defaultTags = ['Codex', '开发日志', '自动日报'];
const defaultMood = '⭐';
const maxSummaryLength = 180;

function shanghaiParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: shanghaiTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function defaultDate(now = new Date()) {
  const parts = shanghaiParts(now);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dayRange(date, now = new Date()) {
  const start = new Date(`${date}T00:00:00+08:00`);
  const next = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const end = now < next ? now : next;
  return { start, end };
}

function formatShanghaiMinute(date) {
  if (!date) return '';
  const parts = shanghaiParts(date);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function safeReadJson(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function walkJsonlFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkJsonlFiles(full, files);
    } else if (entry.endsWith('.jsonl')) {
      files.push(full);
    }
  }
  return files;
}

function shanghaiDateOffset(date, offsetDays) {
  const base = new Date(`${date}T12:00:00+08:00`);
  base.setUTCDate(base.getUTCDate() + offsetDays);
  const parts = shanghaiParts(base);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function sessionDirForShanghaiDate(codexHome, date) {
  const [year, month, day] = date.split('-');
  return join(codexHome, 'sessions', year, month, day);
}

function candidateSessionFiles(codexHome, date) {
  const sessionDates = [
    shanghaiDateOffset(date, -1),
    date,
    shanghaiDateOffset(date, 1),
  ];
  const files = [
    ...sessionDates.flatMap((sessionDate) => walkJsonlFiles(sessionDirForShanghaiDate(codexHome, sessionDate))),
    ...walkJsonlFiles(join(codexHome, 'archived_sessions')),
  ];
  return Array.from(new Set(files));
}

function projectName(cwd) {
  if (!cwd) return 'Codex 工作';
  if (cwd === 'ATRI网站' || cwd.endsWith('/ATRI网站')) return 'ATRI 网站';
  if (cwd.endsWith('/DarkVillageDemo')) return 'DarkVillage 项目';
  if (cwd === '.codex' || cwd.endsWith('/.codex')) return 'Codex 本地配置';
  if (cwd.endsWith('/AI投稿设计')) return 'AI 投稿设计';
  return sanitizeText(basename(cwd) || 'Codex 工作');
}

function outputTextFromMessage(payload) {
  if (payload?.type !== 'message' || payload.role !== 'assistant') return '';
  const content = Array.isArray(payload.content) ? payload.content : [];
  return content
    .filter((item) => item?.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim();
}

function inputTextFromMessage(payload) {
  if (payload?.type !== 'message' || payload.role !== 'user') return '';
  const content = Array.isArray(payload.content) ? payload.content : [];
  return content
    .filter((item) => item?.type === 'input_text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim();
}

function isDailyBlogAutomationControlThread(text) {
  return /(^|\n)\s*Automation ID:\s*atri-codex\b/i.test(text);
}

function trimSummary(text) {
  const cleaned = sanitizeText(text)
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= maxSummaryLength) return cleaned;
  return `${cleaned.slice(0, maxSummaryLength - 1)}…`;
}

function publicSessionSummary(session) {
  const project = session.project || '';
  const raw = sanitizeText(session.summary || '');
  if (project.includes('DarkVillage')) {
    return '推进了本地游戏项目的一轮实现、验证或交接整理；公开日志只保留高层进展。';
  }
  if (project.includes('Codex 本地配置')) {
    return '整理了本机 Codex 配置状态并完成恢复验证；公开日志只保留高层进展。';
  }
  if (!project.includes('ATRI 网站')) {
    return '推进了一轮本地项目协作，公开日志只保留结果摘要。';
  }
  if (project.includes('ATRI 网站') && /token|secret|cookie|jwt|凭据|主机|脱敏|审查|密钥/i.test(raw)) {
    return '推进了 ATRI 网站维护和自动化验证；公开日志只保留可发布的结果摘要。';
  }
  if (/测试|通过|check|smoke|验证/i.test(raw)) {
    return trimSummary(raw);
  }
  if (/修复|fix|bug/i.test(raw)) {
    return trimSummary(raw);
  }
  if (/实现|新增|脚本|automation|自动化/i.test(raw)) {
    return trimSummary(raw);
  }
  if (/提交|commit|文档|docs/i.test(raw)) {
    return trimSummary(raw);
  }
  return '推进了一轮本地项目协作，公开日志只保留结果摘要。';
}

function sessionFromFile(file, start, end) {
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const session = {
    id: '',
    shortId: '',
    project: '',
    startTime: '',
    endTime: '',
    tools: [],
    summary: '',
    git: {},
    inputFile: file,
  };
  const tools = new Set();
  const assistantMessages = [];
  let sawInRange = false;
  let cwd = '';
  let firstTimestamp = null;
  let lastTimestamp = null;
  let isSelfAutomationThread = false;

  for (const line of lines) {
    const row = safeReadJson(line);
    if (!row?.timestamp || !row.payload) continue;
    if (row.type === 'session_meta') {
      session.id = row.payload.id || row.payload.session_id || session.id;
      cwd = row.payload.cwd || cwd;
      if (row.payload.git) {
        session.git = {
          branch: sanitizeText(row.payload.git.branch || ''),
          commit: row.payload.git.commit_hash ? String(row.payload.git.commit_hash).slice(0, 7) : '',
        };
      }
    }
    if (row.type === 'response_item') {
      const userMessage = inputTextFromMessage(row.payload);
      if (userMessage && isDailyBlogAutomationControlThread(userMessage)) {
        isSelfAutomationThread = true;
      }
    }
    if (row.type === 'turn_context') {
      cwd = row.payload.cwd || cwd;
    }
  }

  if (isSelfAutomationThread) return null;

  for (const line of lines) {
    const row = safeReadJson(line);
    if (!row?.timestamp || !row.payload) continue;
    const timestamp = new Date(row.timestamp);
    if (Number.isNaN(timestamp.getTime()) || timestamp < start || timestamp >= end) continue;
    sawInRange = true;
    if (!firstTimestamp || timestamp < firstTimestamp) firstTimestamp = timestamp;
    if (!lastTimestamp || timestamp > lastTimestamp) lastTimestamp = timestamp;

    if (row.type === 'response_item') {
      if (row.payload?.type === 'function_call' && row.payload.name) {
        tools.add(sanitizeText(row.payload.name));
      }
      const message = outputTextFromMessage(row.payload);
      if (message) assistantMessages.push(message);
    }
  }

  if (!sawInRange) return null;
  const fallbackId = basename(file).match(/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})/i)?.[1] || basename(file);
  session.id = session.id || fallbackId;
  session.shortId = sanitizeText(session.id).slice(0, 8);
  session.project = projectName(cwd);
  session.startTime = formatShanghaiMinute(firstTimestamp);
  session.endTime = formatShanghaiMinute(lastTimestamp);
  session.tools = Array.from(tools).sort();
  session.summary = trimSummary(assistantMessages.at(-1) || '完成了一轮 Codex 工作。');
  return session;
}

export function collectCodexSessions({
  codexHome = join(homedir(), '.codex'),
  date = defaultDate(),
  now = new Date(),
} = {}) {
  const { start, end } = dayRange(date, now);
  const sessions = [];
  for (const file of candidateSessionFiles(codexHome, date)) {
    const session = sessionFromFile(file, start, end);
    if (session) sessions.push(session);
  }
  return sessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function sanitizeText(value) {
  return String(value ?? '')
    .replace(/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{3,}\.[A-Za-z0-9_-]{3,}\b/g, '[secret]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[account]')
    .replace(/\b(?:password|passwd|pwd|token|secret|cookie|jwt|refresh_token|access_token)\s*[:=]\s*[^\s,;，。]+/gi, '$1=[secret]')
    .replace(/\bSUPABASE_[A-Z_]*KEY\b/g, '[secret]')
    .replace(/\b[a-z]{20}\.supabase\.co\b/g, '[host]')
    .replace(/\b[a-z]{20}\b/g, '[host-ref]')
    .replace(/\b(?:[a-z_][\w.-]*@)?(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b/gi, '[host]')
    .replace(/https?:\/\/[^\s)）"'`]+/gi, '[url]')
    .replace(/\/Users\/[^\s)）"'`，。；;]+/g, '[local-path]')
    .replace(/\/(?:tmp|private\/tmp|var\/folders)\/[^\s)）"'`，。；;]+/g, '[local-path]');
}

export function reviewPublicPost(content) {
  const text = String(content ?? '');
  const reasons = new Set();
  if (/(?:[a-z_][\w.-]*@)?(?:\d{1,3}\.){3}\d{1,3}|[a-z]{20}\.supabase\.co|https?:\/\//i.test(text)) {
    reasons.add('host');
  }
  if (/\/Users\/|\/tmp\/|\/private\/tmp\/|\/var\/folders\/|Keychain|\.ssh|ssh\s/i.test(text)) {
    reasons.add('local_path');
  }
  if (/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{3,}\.[A-Za-z0-9_-]{3,}\b|SUPABASE_[A-Z_]*KEY|\b(?:password|passwd|pwd|token|secret|cookie|jwt|refresh_token|access_token)\s*[:=]\s*[^\s,;，。]+/i.test(text)) {
    reasons.add('credential');
  }
  if (/system prompt|developer instruction|base_instructions|memory 原文|完整提示词/i.test(text)) {
    reasons.add('private_prompt');
  }
  return {
    ok: reasons.size === 0,
    reasons: Array.from(reasons),
  };
}

export function buildBlogPost({ date = defaultDate(), sessions = [] } = {}) {
  const safeSessions = sessions.map((session) => ({
    shortId: sanitizeText(session.shortId || ''),
    project: sanitizeText(session.project || 'Codex 工作'),
    startTime: sanitizeText(session.startTime || ''),
    summary: trimSummary(session.summary || ''),
    tools: Array.isArray(session.tools) ? session.tools.map((tool) => sanitizeText(tool)).filter(Boolean) : [],
    git: {
      branch: sanitizeText(session.git?.branch || ''),
      commit: sanitizeText(session.git?.commit || ''),
    },
  }));
  const title = `Codex 日志：${date}`;
  const markdown = renderBlogMarkdown({ date, sessions: safeSessions });
  return {
    title,
    excerpt: `今天 Codex 推进了 ${safeSessions.length} 个工作线程。`,
    content: markdown,
    tags: defaultTags,
    mood: defaultMood,
    is_published: true,
  };
}

export function renderBlogMarkdown(input = {}) {
  if (typeof input.content === 'string' && !Array.isArray(input.sessions)) {
    return input.content;
  }
  const { date = defaultDate(), sessions = [] } = input;
  const count = sessions.length;
  const lines = [
    `今天 Codex 主要推进了 ${count} 个工作线程。`,
    '',
    '## 推进记录',
    '',
  ];

  for (const session of sessions) {
    const meta = [
      session.project,
      session.startTime,
    ].filter(Boolean).join(' · ');
    lines.push(`- **${sanitizeText(meta || 'Codex 工作')}**：${publicSessionSummary(session)}`);
    if (session.tools?.length) {
      lines.push(`  - 工具侧重点：${session.tools.slice(0, 6).map((tool) => `\`${sanitizeText(tool)}\``).join('、')}`);
    }
  }

  lines.push(
    '',
    '## 自动审查',
    '',
    `- 日期：${sanitizeText(date)}`,
    '- 已移除本地绝对路径、账号、主机、密钥形态和原始对话片段。',
    '- 只保留可公开的项目级进展摘要。',
  );

  return sanitizeText(lines.join('\n'));
}

export function deriveRunState({ date = defaultDate(), sessions = [] } = {}) {
  if (!sessions.length) {
    return {
      status: 'skipped',
      reason: '无可公开内容。',
    };
  }
  const post = buildBlogPost({ date, sessions });
  const review = reviewPublicPost(post.content);
  if (!review.ok) {
    return {
      status: 'blocked',
      reason: `发布前审查失败：${review.reasons.join(', ')}`,
      post,
      review,
    };
  }
  return {
    status: 'publishable',
    post,
    review,
  };
}

export async function publishBlogPost({ client, post }) {
  const payload = {
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    tags: post.tags,
    mood: post.mood,
    is_published: post.is_published !== false,
    updated_at: new Date().toISOString(),
  };

  const existingQuery = await client
    .from('blog_posts')
    .select('id')
    .eq('title', post.title)
    .maybeSingle();
  if (existingQuery.error) throw existingQuery.error;

  if (existingQuery.data?.id) {
    const updateResult = await client
      .from('blog_posts')
      .update(payload)
      .eq('id', existingQuery.data.id);
    if (updateResult.error) throw updateResult.error;
    return { action: 'updated', id: existingQuery.data.id };
  }

  const insertResult = await client
    .from('blog_posts')
    .insert({
      ...payload,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (insertResult.error) throw insertResult.error;
  return { action: 'inserted', id: insertResult.data?.id || '' };
}

function parseSessionJson(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    const session = parsed.session || parsed;
    if (!session.access_token || !session.refresh_token) return null;
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: Number(session.expires_at || 0),
    };
  } catch {
    return null;
  }
}

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const result = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    result[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
  return result;
}

function localEnv() {
  return {
    ...parseEnvFile(join(root, '.env')),
    ...parseEnvFile(join(root, '.env.local')),
    ...process.env,
  };
}

export async function createAuthorizedClient({
  env = process.env,
  createClientFactory = createClient,
} = {}) {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_PUBLISHABLE_KEY。');
  }

  const session = parseSessionJson(env.CODEX_DAILY_BLOG_SESSION_JSON)
    || parseSessionJson(env.SMOKE_ADMIN_SESSION_JSON);

  const client = createClientFactory(url, key, {
    auth: {
      autoRefreshToken: Boolean(session),
      persistSession: false,
    },
  });

  if (session) {
    const setResult = await client.auth.setSession({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });
    if (setResult.error) throw setResult.error;
    if (!session.expiresAt || session.expiresAt * 1000 < Date.now() + 5 * 60 * 1000) {
      const refreshResult = await client.auth.refreshSession();
      if (refreshResult.error) throw refreshResult.error;
    }
    return client;
  }

  if (env.SMOKE_ADMIN_EMAIL && env.SMOKE_ADMIN_PASSWORD) {
    const { error } = await client.auth.signInWithPassword({
      email: env.SMOKE_ADMIN_EMAIL,
      password: env.SMOKE_ADMIN_PASSWORD,
    });
    if (error) throw error;
    return client;
  }

  throw new Error('缺少可用于写入博客的管理员会话。请设置 CODEX_DAILY_BLOG_SESSION_JSON 或 SMOKE_ADMIN_*。');
}

function reportPath(outputDir, date, status) {
  return join(outputDir, `${date}-${status}.md`);
}

function writeReport({ outputDir, date, status, title, body }) {
  mkdirSync(outputDir, { recursive: true });
  const file = reportPath(outputDir, date, status);
  writeFileSync(file, body, 'utf8');
  return file;
}

function reportMarkdown({ date, state, sessions, publishResult, mode }) {
  const lines = [
    `# Codex 每日博客 ${date}`,
    '',
    `- 状态：${state.status}`,
    `- 模式：${mode}`,
    `- 输入线程：${sessions.length}`,
  ];
  if (state.post?.title) lines.push(`- 标题：${state.post.title}`);
  if (publishResult) lines.push(`- 发布动作：${publishResult.action}`);
  if (state.reason) lines.push(`- 原因：${state.reason}`);
  if (state.review) lines.push(`- 审查：${state.review.ok ? '通过' : `阻断 ${state.review.reasons.join(', ')}`}`);
  if (state.post?.content) {
    lines.push('', '## 公开正文', '', state.post.content);
  }
  return sanitizeText(lines.join('\n'));
}

export async function runDailyBlog({
  date = defaultDate(),
  now = new Date(),
  codexHome = join(homedir(), '.codex'),
  outputDir = join(root, 'output', 'codex-daily-blog'),
  publish = false,
  env = localEnv(),
} = {}) {
  const sessions = collectCodexSessions({ codexHome, date, now });
  const state = deriveRunState({ date, sessions });

  if (state.status === 'skipped') {
    const path = writeReport({
      outputDir,
      date,
      status: 'skipped',
      body: reportMarkdown({ date, state, sessions, mode: publish ? 'publish' : 'dry-run' }),
    });
    return { status: 'skipped', path, sessions };
  }

  if (state.status === 'blocked') {
    const path = writeReport({
      outputDir,
      date,
      status: 'blocked',
      body: reportMarkdown({ date, state, sessions, mode: publish ? 'publish' : 'dry-run' }),
    });
    return { status: 'blocked', path, sessions, review: state.review };
  }

  if (!publish) {
    const path = writeReport({
      outputDir,
      date,
      status: 'dry-run',
      body: reportMarkdown({ date, state, sessions, mode: 'dry-run' }),
    });
    return { status: 'dry-run', path, post: state.post, sessions, review: state.review };
  }

  const client = await createAuthorizedClient({ env });
  const publishResult = await publishBlogPost({ client, post: state.post });
  const path = writeReport({
    outputDir,
    date,
    status: 'published',
    body: reportMarkdown({ date, state: { ...state, status: 'published' }, sessions, publishResult, mode: 'publish' }),
  });
  return { status: 'published', path, post: state.post, publishResult, sessions, review: state.review };
}

function parseArgs(argv) {
  const options = {
    publish: false,
    date: defaultDate(),
    codexHome: join(homedir(), '.codex'),
    outputDir: join(root, 'output', 'codex-daily-blog'),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--publish') options.publish = true;
    if (arg === '--dry-run') options.publish = false;
    if (arg === '--date') {
      const value = argv[index + 1];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw new Error('--date 需要 YYYY-MM-DD。');
      options.date = value;
      index += 1;
    }
    if (arg === '--codex-home') {
      options.codexHome = argv[index + 1];
      index += 1;
    }
    if (arg === '--output-dir') {
      options.outputDir = argv[index + 1];
      index += 1;
    }
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runDailyBlog(options);
  process.stdout.write(JSON.stringify({
    status: result.status,
    path: result.path ? relative(root, result.path) : '',
    title: result.post?.title || '',
    sessions: result.sessions?.length || 0,
    action: result.publishResult?.action || '',
  }, null, 2));
  process.stdout.write('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${sanitizeText(error.message)}\n`);
    process.exit(1);
  });
}

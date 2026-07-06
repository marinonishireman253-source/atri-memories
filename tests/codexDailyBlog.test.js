import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  buildBlogPost,
  collectCodexSessions,
  createAuthorizedClient,
  deriveRunState,
  publishBlogPost,
  renderBlogMarkdown,
  reportMarkdown,
  reviewPublicPost,
  runDailyBlog,
  sanitizeText,
} from '../scripts/codex-daily-blog.mjs';

function writeJsonl(path, rows) {
  writeFileSync(path, rows.map((row) => JSON.stringify(row)).join('\n'), 'utf8');
}

function makeTempRoot() {
  return mkdtempSync(join(tmpdir(), 'atri-codex-blog-'));
}

test('collects only sessions inside the requested Shanghai day and reduces them to public signals', () => {
  const root = makeTempRoot();
  const sessionsDir = join(root, 'sessions', '2026', '06', '30');
  mkdirSync(sessionsDir, { recursive: true });
  writeJsonl(join(sessionsDir, 'rollout-1.jsonl'), [
    {
      timestamp: '2026-06-29T15:50:00.000Z',
      type: 'session_meta',
      payload: {
        id: '019f1111-aaaa-bbbb-cccc-111111111111',
        cwd: '/Users/example/ATRI网站',
        git: { branch: 'main', commit_hash: 'abcdef1234567890' },
      },
    },
    {
      timestamp: '2026-06-29T16:10:00.000Z',
      type: 'session_meta',
      payload: {
        id: '019f2222-aaaa-bbbb-cccc-222222222222',
        cwd: '/Users/example/ATRI网站',
        git: { branch: 'main', commit_hash: '1234567890abcdef' },
      },
    },
    {
      timestamp: '2026-06-29T16:12:00.000Z',
      type: 'response_item',
      payload: { type: 'function_call', name: 'exec_command' },
    },
    {
      timestamp: '2026-06-29T16:13:00.000Z',
      type: 'response_item',
      payload: {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: '已修复博客路由，并运行 npm run check。' }],
      },
    },
  ]);

  const sessions = collectCodexSessions({
    codexHome: root,
    date: '2026-06-30',
    now: new Date('2026-06-30T12:00:00+08:00'),
  });

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].shortId, '019f2222');
  assert.equal(sessions[0].project, 'ATRI 网站');
  assert.deepEqual(sessions[0].tools, ['exec_command']);
  assert.match(sessions[0].summary, /博客路由/);
  assert.equal(sessions[0].git.commit, '1234567');
});

test('keeps project metadata from a long-running thread whose session_meta is before the requested day', () => {
  const root = makeTempRoot();
  const sessionsDir = join(root, 'sessions', '2026', '06', '30');
  mkdirSync(sessionsDir, { recursive: true });
  writeJsonl(join(sessionsDir, 'rollout-cross-day.jsonl'), [
    {
      timestamp: '2026-06-29T15:50:00.000Z',
      type: 'session_meta',
      payload: {
        id: '019f4444-aaaa-bbbb-cccc-444444444444',
        cwd: '/Users/example/ATRI网站',
        git: { branch: 'main', commit_hash: 'abcdef1234567890' },
      },
    },
    {
      timestamp: '2026-06-29T16:10:00.000Z',
      type: 'response_item',
      payload: {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: '已完成自动日报 dry-run。' }],
      },
    },
  ]);

  const sessions = collectCodexSessions({
    codexHome: root,
    date: '2026-06-30',
    now: new Date('2026-06-30T12:00:00+08:00'),
  });

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].project, 'ATRI 网站');
  assert.equal(sessions[0].git.commit, 'abcdef1');
});

test('collects long-running threads stored in the previous Shanghai day directory', () => {
  const root = makeTempRoot();
  const previousDayDir = join(root, 'sessions', '2026', '06', '29');
  mkdirSync(previousDayDir, { recursive: true });
  writeJsonl(join(previousDayDir, 'rollout-started-before-midnight.jsonl'), [
    {
      timestamp: '2026-06-29T15:40:00.000Z',
      type: 'session_meta',
      payload: {
        id: '019f5555-aaaa-bbbb-cccc-555555555555',
        cwd: '/Users/example/ATRI网站',
        git: { branch: 'main', commit_hash: 'fedcba9876543210' },
      },
    },
    {
      timestamp: '2026-06-29T16:20:00.000Z',
      type: 'response_item',
      payload: {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: '跨零点线程在目标日继续完成移动端检查。' }],
      },
    },
  ]);

  const sessions = collectCodexSessions({
    codexHome: root,
    date: '2026-06-30',
    now: new Date('2026-06-30T12:00:00+08:00'),
  });

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].shortId, '019f5555');
  assert.match(sessions[0].summary, /移动端检查/);
});

test('skips automation control threads so the daily blog does not publish itself', () => {
  const root = makeTempRoot();
  const sessionsDir = join(root, 'sessions', '2026', '07', '01');
  mkdirSync(sessionsDir, { recursive: true });
  writeJsonl(join(sessionsDir, 'rollout-automation.jsonl'), [
    {
      timestamp: '2026-06-30T23:30:00.000Z',
      type: 'session_meta',
      payload: {
        id: '019f6666-aaaa-bbbb-cccc-666666666666',
        cwd: '/Users/example/ATRI网站',
      },
    },
    {
      timestamp: '2026-06-30T23:30:01.000Z',
      type: 'response_item',
      payload: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'Automation: ATRI Codex 每日博客自动发布\nAutomation ID: atri-codex' }],
      },
    },
    {
      timestamp: '2026-06-30T23:31:00.000Z',
      type: 'response_item',
      payload: {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: '已完成自动日报 dry-run。' }],
      },
    },
  ]);

  const sessions = collectCodexSessions({
    codexHome: root,
    date: '2026-07-01',
    now: new Date('2026-07-01T12:00:00+08:00'),
  });

  assert.equal(sessions.length, 0);
});

test('sanitizes secrets, public hosts, and absolute paths before rendering', () => {
  const fakeJwt = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.abc.def`;
  const unsafe = [
    '路径 /Users/example/.codex/sessions/example.jsonl',
    'host deploy@203.0.113.10:22022',
    'project abcdefghijklmnopqrst',
    `token ${fakeJwt}`,
    'url https://abcdefghijklmnopqrst.supabase.co',
  ].join('\n');

  const safe = sanitizeText(unsafe);

  assert.doesNotMatch(safe, /\/Users\/example/);
  assert.doesNotMatch(safe, /203\.0\.113\.10/);
  assert.doesNotMatch(safe, /abcdefghijklmnopqrst/);
  assert.doesNotMatch(safe, new RegExp(fakeJwt.slice(0, 3)));
  assert.match(safe, /\[local-path\]/);
  assert.match(safe, /\[host\]/);
  assert.match(safe, /\[secret\]/);
});

test('blocks publishing when the public post still contains red-line content', () => {
  const review = reviewPublicPost('今天部署到 203.0.113.10，并读取 SUPABASE_SECRET_KEY。');

  assert.equal(review.ok, false);
  assert.deepEqual(review.reasons.sort(), ['credential', 'host']);
});

test('does not treat an ordinary security topic word as a credential by itself', () => {
  const review = reviewPublicPost('检查发布凭据生命周期，避免公开敏感值。');

  assert.equal(review.ok, true);
});

test('derives skipped state when there is no public session content', () => {
  const state = deriveRunState({
    date: '2026-06-30',
    sessions: [],
  });

  assert.equal(state.status, 'skipped');
  assert.match(state.reason, /无可公开内容/);
});

test('renders a concise Chinese daily blog from safe session summaries', () => {
  const post = buildBlogPost({
    date: '2026-06-30',
    sessions: [
      {
        shortId: '019f2222',
        project: 'ATRI 网站',
        startTime: '2026-06-30 00:10',
        summary: '修复博客入口，并通过 npm run check。',
        tools: ['exec_command'],
        git: { branch: 'main', commit: '1234567' },
      },
    ],
  });
  const markdown = renderBlogMarkdown(post);

  assert.equal(post.title, 'Codex 日志：2026-06-30');
  assert.deepEqual(post.tags, ['Codex', '开发日志', '自动日报']);
  assert.match(markdown, /今天 Codex 主要推进了 1 个工作线程/);
  assert.match(markdown, /ATRI 网站/);
  assert.doesNotMatch(markdown, /\/Users\//);
});

test('groups detailed ATRI closeouts into a public project-level summary', () => {
  const post = buildBlogPost({
    date: '2026-07-01',
    sessions: [
      {
        project: 'ATRI 网站',
        startTime: '2026-07-01 10:02',
        summary: 'Committed `f17fc54` and changed AppOverlays.jsx to fix the admin image viewer.',
        tools: ['exec_command'],
      },
      {
        project: 'ATRI 网站',
        startTime: '2026-07-01 11:22',
        summary: 'Added /case-study smoke coverage, project checks, and release preflight wiring.',
        tools: ['exec_command', 'js'],
      },
    ],
  });

  assert.match(post.content, /ATRI 网站维护/);
  assert.match(post.content, /2 个线程/);
  assert.doesNotMatch(post.content, /f17fc54|AppOverlays|\/case-study|release preflight/);
});

test('renders private game work as high-level progress and strips temporary image paths', () => {
  const post = buildBlogPost({
    date: '2026-06-30',
    sessions: [
      {
        shortId: '019f3333',
        project: 'DarkVillage 项目',
        startTime: '2026-06-30 09:23',
        summary: '剧情战斗 active ![capture](/tmp/dv_story_combat.png)，Boss 前摇机制已经接入。',
        tools: ['exec_command', 'view_image'],
      },
    ],
  });

  assert.doesNotMatch(post.content, /\/tmp/);
  assert.doesNotMatch(post.content, /剧情战斗|Boss|机制/);
  assert.match(post.content, /高层进展/);
});

test('omits branch and commit metadata from public blog content', () => {
  const post = buildBlogPost({
    date: '2026-06-30',
    sessions: [
      {
        project: 'Codex 本地配置',
        startTime: '2026-06-30 10:40',
        summary: '已经修了 config.toml 插件安装态，并验证 github 插件恢复。',
        git: { branch: 'codex/internal-plugin-state', commit: 'abcdef1' },
      },
    ],
  });

  assert.doesNotMatch(post.content, /codex\/internal-plugin-state|abcdef1|config\.toml|github 插件/);
  assert.match(post.content, /本机 Codex 配置/);
});

test('summarizes unknown local projects without raw implementation details', () => {
  const post = buildBlogPost({
    date: '2026-06-30',
    sessions: [
      {
        project: '宿敌',
        startTime: '2026-06-30 10:50',
        summary: '已删除 feature/platform-depth-aoe，运行 node scripts/verify-platform-depth-aoe.js，并提交计划。',
      },
    ],
  });

  assert.doesNotMatch(post.content, /feature\/platform-depth-aoe|verify-platform-depth-aoe|node scripts|提交计划/);
  assert.match(post.content, /本地项目协作/);
});

test('summarizes ATRI internal security review wording before public review runs', () => {
  const state = deriveRunState({
    date: '2026-06-30',
    sessions: [
      {
        project: 'ATRI 网站',
        startTime: '2026-06-30 11:12',
        summary: '代码里要验证发布 token 的生命周期、主机名脱敏覆盖范围。',
        tools: ['exec_command'],
      },
    ],
  });

  assert.equal(state.status, 'publishable');
  assert.doesNotMatch(state.post.content, /token|主机名脱敏/);
  assert.match(state.post.content, /ATRI 网站维护/);
});

test('refreshes session JSON credentials before returning a Supabase client', async () => {
  const calls = [];
  const fakeClient = {
    auth: {
      setSession: async (session) => {
        calls.push(['setSession', session.access_token, session.refresh_token]);
        return { data: { session }, error: null };
      },
      refreshSession: async () => {
        calls.push(['refreshSession']);
        return { data: { session: { access_token: 'fresh-access-token' } }, error: null };
      },
    },
  };

  const client = await createAuthorizedClient({
    env: {
      VITE_SUPABASE_URL: 'https://example.invalid',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      CODEX_DAILY_BLOG_SESSION_JSON: JSON.stringify({
        access_token: 'old-access-token',
        refresh_token: 'refresh-token',
        expires_at: 0,
      }),
    },
    createClientFactory: () => fakeClient,
  });

  assert.equal(client, fakeClient);
  assert.deepEqual(calls, [
    ['setSession', 'old-access-token', 'refresh-token'],
    ['refreshSession'],
  ]);
});

test('creates a service-role client without an admin session when server key is provided', async () => {
  const calls = [];
  const fakeClient = {
    auth: {
      setSession: async () => {
        calls.push(['unexpected-setSession']);
        return { data: {}, error: null };
      },
    },
  };

  const client = await createAuthorizedClient({
    env: {
      VITE_SUPABASE_URL: 'https://example.invalid',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      SUPABASE_SERVICE_ROLE_KEY: 'server-only-key',
    },
    createClientFactory: (url, key, options) => {
      calls.push(['createClient', url, key, options.auth.persistSession]);
      return fakeClient;
    },
  });

  assert.equal(client, fakeClient);
  assert.deepEqual(calls, [
    ['createClient', 'https://example.invalid', 'server-only-key', false],
  ]);
});

test('creates a service-role client from a private command fallback', async () => {
  const calls = [];
  const fakeClient = {
    auth: {
      setSession: async () => {
        calls.push(['unexpected-setSession']);
        return { data: {}, error: null };
      },
    },
  };

  const client = await createAuthorizedClient({
    env: {
      VITE_SUPABASE_URL: 'https://example.invalid',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      CODEX_DAILY_BLOG_SERVICE_ROLE_KEY_COMMAND: 'read-private-server-key',
    },
    runSecretCommand: async (command) => {
      calls.push(['runSecretCommand', command]);
      return 'server-key-from-private-command\n';
    },
    createClientFactory: (url, key, options) => {
      calls.push(['createClient', url, key, options.auth.persistSession]);
      return fakeClient;
    },
  });

  assert.equal(client, fakeClient);
  assert.deepEqual(calls, [
    ['runSecretCommand', 'read-private-server-key'],
    ['createClient', 'https://example.invalid', 'server-key-from-private-command', false],
  ]);
});

test('publishes with an authenticated bearer token and updates existing daily post', async () => {
  const calls = [];
  const fakeClient = {
    from(table) {
      calls.push(['from', table]);
      return {
        select(columns) {
          calls.push(['select', columns]);
          return {
            eq(column, value) {
              calls.push(['eq', column, value]);
              return {
                maybeSingle: async () => ({ data: { id: 'post-1' }, error: null }),
              };
            },
          };
        },
        update(payload) {
          calls.push(['update', payload.title, payload.is_published]);
          return {
            eq(column, value) {
              calls.push(['update-eq', column, value]);
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };

  const result = await publishBlogPost({
    client: fakeClient,
    post: buildBlogPost({ date: '2026-06-30', sessions: [{ project: 'ATRI 网站', summary: '完成日报脚本。' }] }),
  });

  assert.equal(result.action, 'updated');
  assert.deepEqual(calls[0], ['from', 'blog_posts']);
  assert.deepEqual(calls.at(-1), ['update-eq', 'id', 'post-1']);
});

test('writes a blocked report when publish mode lacks an admin session', async () => {
  const root = makeTempRoot();
  const sessionsDir = join(root, 'sessions', '2026', '07', '01');
  const outputDir = join(root, 'output');
  mkdirSync(sessionsDir, { recursive: true });
  writeJsonl(join(sessionsDir, 'rollout-publishable.jsonl'), [
    {
      timestamp: '2026-07-01T10:00:00.000Z',
      type: 'session_meta',
      payload: {
        id: '019f7777-aaaa-bbbb-cccc-777777777777',
        cwd: '/Users/example/ATRI网站',
      },
    },
    {
      timestamp: '2026-07-01T10:02:00.000Z',
      type: 'response_item',
      payload: {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: '完成移动端检查，并通过 npm run check。' }],
      },
    },
  ]);

  const result = await runDailyBlog({
    date: '2026-07-01',
    now: new Date('2026-07-01T23:30:00+08:00'),
    codexHome: root,
    outputDir,
    publish: true,
    env: {
      VITE_SUPABASE_URL: 'https://example.invalid',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
    },
  });

  assert.equal(result.status, 'blocked');
  assert.match(result.path, /2026-07-01-blocked\.md$/);
});

test('records the distinct input file count in generated reports', async () => {
  const root = makeTempRoot();
  const sessionsDir = join(root, 'sessions', '2026', '07', '03');
  const outputDir = join(root, 'output');
  mkdirSync(sessionsDir, { recursive: true });
  writeJsonl(join(sessionsDir, 'rollout-one.jsonl'), [
    {
      timestamp: '2026-07-03T10:00:00.000Z',
      type: 'session_meta',
      payload: {
        id: '019f8888-aaaa-bbbb-cccc-888888888888',
        cwd: '/Users/example/ATRI网站',
      },
    },
    {
      timestamp: '2026-07-03T10:02:00.000Z',
      type: 'response_item',
      payload: {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: '完成博客自动化检查。' }],
      },
    },
  ]);
  writeJsonl(join(sessionsDir, 'rollout-two.jsonl'), [
    {
      timestamp: '2026-07-03T11:00:00.000Z',
      type: 'session_meta',
      payload: {
        id: '019f9999-aaaa-bbbb-cccc-999999999999',
        cwd: '/Users/example/DarkVillageDemo',
      },
    },
    {
      timestamp: '2026-07-03T11:03:00.000Z',
      type: 'response_item',
      payload: {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: '完成游戏项目高层整理。' }],
      },
    },
  ]);

  const result = await runDailyBlog({
    date: '2026-07-03',
    now: new Date('2026-07-03T23:30:00+08:00'),
    codexHome: root,
    outputDir,
    publish: false,
  });

  const report = readFileSync(result.path, 'utf8');

  assert.equal(result.status, 'dry-run');
  assert.match(report, /- 输入文件：2/);
});

test('records the publish timestamp in published reports', () => {
  const report = reportMarkdown({
    date: '2026-07-03',
    state: {
      status: 'published',
      post: buildBlogPost({
        date: '2026-07-03',
        sessions: [{ project: 'ATRI 网站', summary: '完成博客自动化检查。' }],
      }),
      review: { ok: true, reasons: [] },
    },
    sessions: [{ inputFile: '/tmp/rollout-one.jsonl' }],
    publishResult: { action: 'inserted' },
    mode: 'publish',
    generatedAt: new Date('2026-07-03T15:35:00.000Z'),
  });

  assert.match(report, /- 发布时间：2026-07-03 23:35/);
});

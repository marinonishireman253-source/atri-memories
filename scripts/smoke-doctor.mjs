import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkShareMemoryPreview,
  shareMemoryDetail,
} from './share-preview-diagnostics.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = dirname(__dirname);
const defaultChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function parseEnvFile(path) {
  try {
    const content = readFileSync(path, 'utf8');
    return Object.fromEntries(
      content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const index = line.indexOf('=');
          return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
}

function envValue(envFile, key) {
  return process.env[key] ?? envFile[key] ?? '';
}

function parseJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return 'invalid';
  }
}

function statusLine(ok, label, detail) {
  const prefix = ok ? '[OK]' : '[WARN]';
  process.stdout.write(`${prefix} ${label}${detail ? `: ${detail}` : ''}\n`);
}

function present(value) {
  return value ? '已提供' : '未提供';
}

async function main() {
  const envFile = parseEnvFile(join(root, '.env'));
  const supabaseUrl = envValue(envFile, 'VITE_SUPABASE_URL');
  const publishableKey =
    envValue(envFile, 'VITE_SUPABASE_PUBLISHABLE_KEY')
    || envValue(envFile, 'VITE_SUPABASE_ANON_KEY');
  const publicSiteUrl = envValue(envFile, 'VITE_PUBLIC_SITE_URL');
  const shareLinkMode = envValue(envFile, 'VITE_SHARE_LINK_MODE') || 'app';
  const chromePath = process.env.SMOKE_BROWSER_PATH || defaultChromePath;

  const adminSession = parseJson(envValue(envFile, 'SMOKE_ADMIN_SESSION_JSON'));
  const userSession = parseJson(envValue(envFile, 'SMOKE_USER_SESSION_JSON'));
  const adminEmail = envValue(envFile, 'SMOKE_ADMIN_EMAIL');
  const adminPassword = envValue(envFile, 'SMOKE_ADMIN_PASSWORD');
  const userEmail = envValue(envFile, 'SMOKE_USER_EMAIL');
  const userPassword = envValue(envFile, 'SMOKE_USER_PASSWORD');

  process.stdout.write('Smoke Doctor\n');
  process.stdout.write('============\n');

  statusLine(Boolean(supabaseUrl), 'VITE_SUPABASE_URL', present(supabaseUrl));
  statusLine(Boolean(publishableKey), 'VITE_SUPABASE_PUBLISHABLE_KEY / ANON_KEY', present(publishableKey));
  statusLine(Boolean(publicSiteUrl), 'VITE_PUBLIC_SITE_URL', publicSiteUrl || '未提供');
  statusLine(['app', 'preview'].includes(shareLinkMode), 'VITE_SHARE_LINK_MODE', shareLinkMode);
  statusLine(existsSync(chromePath), 'SMOKE_BROWSER_PATH', chromePath);

  statusLine(adminSession && adminSession !== 'invalid', 'SMOKE_ADMIN_SESSION_JSON', adminSession === 'invalid' ? 'JSON 非法' : present(adminSession));
  statusLine(userSession && userSession !== 'invalid', 'SMOKE_USER_SESSION_JSON', userSession === 'invalid' ? 'JSON 非法' : present(userSession));
  statusLine(Boolean(adminEmail && adminPassword), '管理员邮箱密码', `${present(adminEmail)} / ${present(adminPassword)}`);
  statusLine(Boolean(userEmail && userPassword), '普通用户邮箱密码', `${present(userEmail)} / ${present(userPassword)}`);

  process.stdout.write('\n场景判定\n');
  process.stdout.write('--------\n');
  statusLine(true, '访客桌面端 smoke', '始终可跑（demo 模式）');
  statusLine(true, '访客手机视口 smoke', '始终可跑（demo 模式）');
  if (supabaseUrl && publishableKey) {
    const shareMemory = await checkShareMemoryPreview({ supabaseUrl, publishableKey });
    const detail = shareMemoryDetail(shareMemory);
    statusLine(shareMemory.ok, shareMemory.memoryId ? 'share-memory 真实预览' : 'share-memory 远端检查', shareMemory.ok
      ? detail
      : shareMemory.error ? `${detail ? `${detail}；` : ''}${shareMemory.error}` : detail);
    if (shareMemory.ok) {
      statusLine(shareMemory.hasHtmlMeta, 'share-memory OG/Twitter meta', shareMemory.hasHtmlMeta ? '已输出真实分享页 meta' : '未检查到完整 meta');
      statusLine(
        shareMemory.isHtmlContentType || shareMemory.isSupabaseTextPlainHtml,
        'share-memory content-type',
        shareMemory.isSupabaseTextPlainHtml
          ? `${shareMemory.contentType}（Supabase GET HTML 会重写为 text/plain；正文 meta 已通过）`
          : shareMemory.contentType || '未返回',
      );
    }
  } else {
    statusLine(false, 'share-memory 远端检查', '缺少 Supabase 前端配置');
  }

  const adminReady = (adminSession && adminSession !== 'invalid') || (adminEmail && adminPassword);
  const userReady = (userSession && userSession !== 'invalid') || (userEmail && userPassword);
  statusLine(Boolean(adminReady), '管理员已登录 smoke', adminReady ? '可执行' : '缺少管理员会话或邮箱密码');
  statusLine(Boolean(userReady), '普通用户已登录 smoke', userReady ? '可执行' : '缺少普通用户会话或邮箱密码');

  process.stdout.write('\n建议下一步\n');
  process.stdout.write('--------\n');
  if (!supabaseUrl || !publishableKey) {
    process.stdout.write('- 先补 .env 里的 VITE_SUPABASE_URL 与 VITE_SUPABASE_PUBLISHABLE_KEY。\n');
  }
  if (!existsSync(chromePath)) {
    process.stdout.write(`- 设置 SMOKE_BROWSER_PATH，当前默认浏览器路径不存在：${chromePath}\n`);
  }
  if (!adminReady) {
    process.stdout.write("- 运行 `npm run smoke:session -- --role admin --email ... --password ...` 生成管理员会话。\n");
  }
  if (!userReady) {
    process.stdout.write("- 运行 `npm run smoke:session -- --role user --email ... --password ...` 生成普通用户会话。\n");
  }
  if (supabaseUrl && publishableKey && existsSync(chromePath)) {
    process.stdout.write('- 运行 `npm run smoke` 做当前环境下的实际回归。\n');
  }
}

main();

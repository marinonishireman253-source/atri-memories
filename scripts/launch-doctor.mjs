import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkShareMemoryPreview,
  shareMemoryDetail,
} from './share-preview-diagnostics.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = dirname(__dirname);

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

function isLocalOrigin(value) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value);
}

function statusLine(ok, label, detail) {
  const prefix = ok ? '[OK]' : '[WARN]';
  process.stdout.write(`${prefix} ${label}${detail ? `: ${detail}` : ''}\n`);
}

async function main() {
  const envFile = parseEnvFile(join(root, '.env'));
  const supabaseUrl = envValue(envFile, 'VITE_SUPABASE_URL');
  const publishableKey =
    envValue(envFile, 'VITE_SUPABASE_PUBLISHABLE_KEY')
    || envValue(envFile, 'VITE_SUPABASE_ANON_KEY');
  const publicSiteUrl = envValue(envFile, 'VITE_PUBLIC_SITE_URL');
  const shareLinkMode = envValue(envFile, 'VITE_SHARE_LINK_MODE') || 'app';

  process.stdout.write('Launch Doctor\n');
  process.stdout.write('=============\n');

  statusLine(Boolean(supabaseUrl), 'VITE_SUPABASE_URL', supabaseUrl || '未提供');
  statusLine(Boolean(publishableKey), 'VITE_SUPABASE_PUBLISHABLE_KEY / ANON_KEY', publishableKey ? '已提供' : '未提供');
  statusLine(Boolean(publicSiteUrl), 'VITE_PUBLIC_SITE_URL', publicSiteUrl || '未提供');
  statusLine(Boolean(publicSiteUrl && !isLocalOrigin(publicSiteUrl)), '生产域名候选值', publicSiteUrl ? (isLocalOrigin(publicSiteUrl) ? '仍是本地地址' : publicSiteUrl) : '未提供');
  statusLine(['app', 'preview'].includes(shareLinkMode), 'VITE_SHARE_LINK_MODE', shareLinkMode);

  if (supabaseUrl) {
    const shareMemory = await checkShareMemoryPreview({ supabaseUrl, publishableKey });
    const detail = shareMemoryDetail(shareMemory);

    statusLine(shareMemory.ok, shareMemory.memoryId ? 'share-memory 真实预览' : 'share-memory 云端可达性', shareMemory.ok
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
    statusLine(false, 'share-memory 云端可达性', '缺少 VITE_SUPABASE_URL，无法探测');
  }

  process.stdout.write('\n策略判定\n');
  process.stdout.write('--------\n');
  statusLine(shareLinkMode === 'app' || (shareLinkMode === 'preview' && publicSiteUrl), '分享链接策略', shareLinkMode === 'preview'
    ? (publicSiteUrl ? 'preview 模式具备主站域名' : 'preview 模式但没有 VITE_PUBLIC_SITE_URL')
    : '当前走主站 /memory/<id> 分享链接');
  statusLine(Boolean(publishableKey), '前端公开环境变量', '当前只检查到 publishable / anon key；service role 仍应只留在服务端');
  statusLine(false, 'Supabase Auth site_url / redirect URLs', '这项无法从本地 .env 直接证明，仍需到 Supabase Dashboard 核对');
  statusLine(false, 'Edge Function Secret PUBLIC_SITE_URL', '这项无法从本地 .env 直接证明，仍需到 Supabase Dashboard 核对');

  process.stdout.write('\n建议下一步\n');
  process.stdout.write('--------\n');
  if (!publicSiteUrl) {
    process.stdout.write('- 在 .env 或生产环境里补 VITE_PUBLIC_SITE_URL。\n');
  }
  if (shareLinkMode === 'preview' && !publicSiteUrl) {
    process.stdout.write('- 当前 share preview 策略无法完整生效，先补公开域名。\n');
  }
  process.stdout.write('- 到 Supabase Dashboard 核对 Auth site_url 与 redirect URLs。\n');
  process.stdout.write('- 到 Edge Functions 配置里核对 PUBLIC_SITE_URL。\n');
  process.stdout.write('- 在真正上线前继续运行 `npm run verify`、`npm run smoke` 和本脚本。\n');
}

main();

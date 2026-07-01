import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

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

function commandVersion(command, args = ['--version']) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) return '';
  return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim().split('\n')[0] ?? '';
}

function statusLine(ok, label, detail) {
  const prefix = ok ? '[OK]' : '[WARN]';
  process.stdout.write(`${prefix} ${label}${detail ? `: ${detail}` : ''}\n`);
}

function isLocalOrigin(value) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value);
}

function projectRefFromSupabaseUrl(value) {
  try {
    const host = new URL(value).hostname;
    const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return match?.[1] ?? '';
  } catch {
    return '';
  }
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

const envFile = parseEnvFile(join(root, '.env'));
const supabaseUrl = envValue(envFile, 'VITE_SUPABASE_URL');
const publicSiteUrl = envValue(envFile, 'VITE_PUBLIC_SITE_URL');
const shareLinkMode = envValue(envFile, 'VITE_SHARE_LINK_MODE') || 'app';
const projectRef = projectRefFromSupabaseUrl(supabaseUrl);
const supabaseVersion = commandVersion('supabase');
const denoVersion = commandVersion('deno', ['--version']);
const shareMemorySource = read('supabase/functions/share-memory/index.ts');
const packageJson = JSON.parse(read('package.json'));
const hasFunctionCheck = Boolean(packageJson.scripts?.['functions:check']);

process.stdout.write('Deploy Doctor\n');
process.stdout.write('=============\n');

statusLine(Boolean(supabaseVersion), 'Supabase CLI', supabaseVersion || '未安装或不在 PATH，无法从本机部署 Edge Function');
statusLine(Boolean(denoVersion), 'Deno', denoVersion || '未安装或不在 PATH，无法本地检查 Edge Function');
statusLine(Boolean(supabaseUrl), 'VITE_SUPABASE_URL', supabaseUrl || '未提供');
statusLine(Boolean(projectRef), 'Supabase project ref', projectRef || '无法从 VITE_SUPABASE_URL 解析');
statusLine(Boolean(publicSiteUrl && !isLocalOrigin(publicSiteUrl)), '生产 VITE_PUBLIC_SITE_URL', publicSiteUrl ? (isLocalOrigin(publicSiteUrl) ? '仍是本地地址' : publicSiteUrl) : '未提供');
statusLine(['app', 'preview'].includes(shareLinkMode), 'VITE_SHARE_LINK_MODE', shareLinkMode);
statusLine(hasFunctionCheck, 'Edge Function 本地检查脚本', hasFunctionCheck ? 'npm run functions:check' : '缺少 functions:check');
statusLine(
  shareMemorySource.includes('HTML_CONTENT_TYPE')
    && /content-type|Content-Type/.test(shareMemorySource)
    && /nosniff/i.test(shareMemorySource),
  'share-memory HTML 响应头',
  '本地代码显式设置 HTML MIME 与 nosniff；Supabase GET HTML 会在远端重写为 text/plain',
);

process.stdout.write('\n部署命令提示\n');
process.stdout.write('------------\n');
if (!supabaseVersion) {
  process.stdout.write('- 先安装并登录 Supabase CLI，再重新运行 `npm run deploy:doctor`。\n');
} else {
  process.stdout.write('- `supabase login`\n');
}
if (projectRef) {
  process.stdout.write(`- \`supabase link --project-ref ${projectRef}\`\n`);
  process.stdout.write(`- \`supabase functions deploy share-memory --project-ref ${projectRef}\`\n`);
  if (publicSiteUrl) {
    process.stdout.write(`- \`supabase secrets set PUBLIC_SITE_URL=${publicSiteUrl} --project-ref ${projectRef}\`\n`);
  } else {
    process.stdout.write(`- \`supabase secrets set PUBLIC_SITE_URL=https://<生产域名> --project-ref ${projectRef}\`\n`);
  }
} else {
  process.stdout.write('- 补齐 VITE_SUPABASE_URL 后再生成 project-ref 相关部署命令。\n');
}

process.stdout.write('\n上线前仍需人工核对\n');
process.stdout.write('------------------\n');
process.stdout.write('- Supabase Auth site_url 与 redirect URLs 已指向生产域名。\n');
process.stdout.write('- Supabase Dashboard 的 Edge Function Secret `PUBLIC_SITE_URL` 与前端 `VITE_PUBLIC_SITE_URL` 一致。\n');
process.stdout.write('- 部署后重新运行 `npm run launch:doctor`，确认远端 `share-memory` 正文 meta 通过；Supabase GET HTML 会重写为 `text/plain`。\n');
process.stdout.write('- 配好管理员 / 普通用户 smoke 会话后重新运行 `npm run release:preflight`。\n');

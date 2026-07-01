import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

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

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return '';
  return process.argv[index + 1] ?? '';
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function usage() {
  process.stdout.write(`用法:
  npm run smoke:session -- --role admin --email admin@example.com --password 'secret'
  npm run smoke:session -- --role user --email user@example.com --password 'secret' --format json

参数:
  --role      admin 或 user，决定输出为哪条 SMOKE_*_SESSION_JSON
  --email     登录邮箱
  --password  登录密码
  --format    env 或 json，默认 env
  --help      显示帮助

环境:
  读取 VITE_SUPABASE_URL 与 VITE_SUPABASE_PUBLISHABLE_KEY（或 VITE_SUPABASE_ANON_KEY）
  来源优先级：当前环境变量 > .env 文件
`);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function buildSessionPayload(session) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user
      ? {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role,
          email_confirmed_at: session.user.email_confirmed_at,
        }
      : null,
  };
}

async function main() {
  if (hasFlag('--help')) {
    usage();
    return;
  }

  const role = readArg('--role');
  const email = readArg('--email');
  const password = readArg('--password');
  const format = readArg('--format') || 'env';

  if (!['admin', 'user'].includes(role)) {
    fail('必须提供 --role admin 或 --role user。');
  }
  if (!email || !password) {
    fail('必须同时提供 --email 和 --password。');
  }
  if (!['env', 'json'].includes(format)) {
    fail('--format 只能是 env 或 json。');
  }

  const envFile = parseEnvFile(join(root, '.env'));
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? envFile.VITE_SUPABASE_URL;
  const publishableKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.VITE_SUPABASE_ANON_KEY
    ?? envFile.VITE_SUPABASE_PUBLISHABLE_KEY
    ?? envFile.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    fail('未找到 VITE_SUPABASE_URL 和 VITE_SUPABASE_PUBLISHABLE_KEY（或 VITE_SUPABASE_ANON_KEY）。');
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    fail(`登录失败：${error?.message ?? '未返回 session'}`);
  }

  const payload = buildSessionPayload(data.session);
  const json = JSON.stringify(payload);

  if (format === 'json') {
    process.stdout.write(`${json}\n`);
    return;
  }

  const envKey = role === 'admin' ? 'SMOKE_ADMIN_SESSION_JSON' : 'SMOKE_USER_SESSION_JSON';
  process.stdout.write(`${envKey}='${json}'\n`);
}

main();

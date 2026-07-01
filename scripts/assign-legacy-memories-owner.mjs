import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const KEYCHAIN_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEYCHAIN_SERVICE || '';
const KEYCHAIN_ACCOUNT = process.env.SUPABASE_SERVICE_ROLE_KEYCHAIN_ACCOUNT || '';

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

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function readServiceRoleFromKeychain() {
  if (!KEYCHAIN_SERVICE || !KEYCHAIN_ACCOUNT) return '';

  try {
    return execFileSync('security', [
      'find-generic-password',
      '-s',
      KEYCHAIN_SERVICE,
      '-a',
      KEYCHAIN_ACCOUNT,
      '-w',
    ], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function usage() {
  process.stdout.write(`用法:
  node scripts/assign-legacy-memories-owner.mjs --email admin@example.com --dry-run
  node scripts/assign-legacy-memories-owner.mjs --single-user --dry-run
  SUPABASE_SERVICE_ROLE_KEY='...' node scripts/assign-legacy-memories-owner.mjs --email admin@example.com

作用:
  把 public.memories 中 owner_id 为空的历史图片归属到指定账号，并给空标签图片补上基础分类。

参数:
  --email        目标账号邮箱，必须对应 auth.users 中的用户。
  --single-user  自动使用 auth.users 中唯一账号。
  --tags         空标签图片要补充的分类，默认：ATRI,生成图。
  --dry-run      只统计和校验，不执行更新。
  --help         显示帮助。

环境:
  读取 VITE_SUPABASE_URL。
  SUPABASE_SERVICE_ROLE_KEY 优先从当前环境变量读取；如果没有，则在设置
  SUPABASE_SERVICE_ROLE_KEYCHAIN_SERVICE 和 SUPABASE_SERVICE_ROLE_KEYCHAIN_ACCOUNT 后读取 macOS Keychain。
  不建议把 service role key 写入 .env。
`);
}

function normalizeTags(value) {
  const source = Array.isArray(value) ? value : String(value ?? '').split(/[,，、\s]+/);
  const seen = new Set();
  const tags = [];

  for (const item of source) {
    const tag = String(item).trim().slice(0, 24);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length >= 8) break;
  }

  return tags;
}

async function listAllUsers(supabase) {
  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) fail(`读取 auth.users 失败：${error.message}`);

    users.push(...(data.users ?? []));

    if ((data.users ?? []).length < perPage) break;
    page += 1;
  }

  return users;
}

async function listAllUsersByEmail(supabase, email) {
  return (await listAllUsers(supabase)).filter(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );
}

async function resolveTargetUser(supabase, { email, singleUser }) {
  if (singleUser) {
    const users = await listAllUsers(supabase);
    if (users.length === 0) fail('auth.users 中没有账号。');
    if (users.length > 1) fail(`auth.users 中有 ${users.length} 个账号，不能使用 --single-user。请改用 --email。`);
    return users[0];
  }

  const users = await listAllUsersByEmail(supabase, email);
  if (users.length === 0) fail(`auth.users 中找不到邮箱：${email}`);
  if (users.length > 1) fail(`auth.users 中找到多个同邮箱用户：${email}`);
  return users[0];
}

async function main() {
  if (hasFlag('--help')) {
    usage();
    return;
  }

  const email = readArg('--email').trim();
  const singleUser = hasFlag('--single-user');
  const defaultTags = normalizeTags(readArg('--tags') || 'ATRI,生成图');
  const dryRun = hasFlag('--dry-run');
  if (!email && !singleUser) fail('必须提供 --email，或在全站只有一个账号时使用 --single-user。');
  if (email && singleUser) fail('--email 和 --single-user 只能二选一。');
  if (!defaultTags.length) fail('--tags 至少需要一个分类标签。');

  const envFile = parseEnvFile(join(root, '.env'));
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? envFile.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? readServiceRoleFromKeychain();
  if (!supabaseUrl) fail('未找到 VITE_SUPABASE_URL。');
  if (!serviceRoleKey) {
    fail('未找到 SUPABASE_SERVICE_ROLE_KEY，也未从本机 Keychain 读取到 service role key。');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const targetUser = await resolveTargetUser(supabase, { email, singleUser });
  const { data: adminRow, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', targetUser.id)
    .maybeSingle();
  if (adminError) fail(`校验管理员身份失败：${adminError.message}`);
  if (!adminRow) fail(`目标账号不是管理员：${targetUser.email} (${targetUser.id})`);

  const { data: legacyRows, count: beforeCount, error: countError } = await supabase
    .from('memories')
    .select('id, title, tags', { count: 'exact' })
    .is('owner_id', null)
    .order('created_at', { ascending: true })
    .limit(1000);
  if (countError) fail(`统计无归属图片失败：${countError.message}`);
  if ((beforeCount ?? 0) > (legacyRows?.length ?? 0)) {
    fail(`无归属图片超过脚本单次处理上限：${beforeCount} 张。`);
  }

  const emptyTagCount = (legacyRows ?? []).filter((row) => !normalizeTags(row.tags).length).length;

  process.stdout.write(`目标管理员：${targetUser.email} (${targetUser.id})\n`);
  process.stdout.write(`待归属图片：${beforeCount ?? 0} 张\n`);
  process.stdout.write(`空标签图片：${emptyTagCount} 张\n`);
  process.stdout.write(`空标签补充分类：${defaultTags.join('，')}\n`);

  if (dryRun) {
    process.stdout.write('Dry run：未执行更新。\n');
    return;
  }

  if (!beforeCount) {
    process.stdout.write('没有需要更新的历史图片。\n');
    return;
  }

  let updated = 0;
  for (const row of legacyRows ?? []) {
    const currentTags = normalizeTags(row.tags);
    const nextTags = currentTags.length ? currentTags : defaultTags;
    const { error: updateError } = await supabase
      .from('memories')
      .update({
        owner_id: targetUser.id,
        owner_email: targetUser.email,
        tags: nextTags,
      })
      .eq('id', row.id)
      .is('owner_id', null);
    if (updateError) fail(`更新 ${row.id} 失败：${updateError.message}`);
    updated += 1;
  }

  const { count: afterCount, error: afterError } = await supabase
    .from('memories')
    .select('id', { count: 'exact', head: true })
    .is('owner_id', null);
  if (afterError) fail(`复核剩余无归属图片失败：${afterError.message}`);

  process.stdout.write(`已处理图片：${updated} 张\n`);
  process.stdout.write(`已归属图片：${beforeCount - (afterCount ?? 0)} 张\n`);
  process.stdout.write(`剩余无归属图片：${afterCount ?? 0} 张\n`);
}

main();

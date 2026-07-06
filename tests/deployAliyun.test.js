import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const deployScript = readFileSync(new URL('../scripts/deploy-aliyun.mjs', import.meta.url), 'utf8');

test('Aliyun deploy also syncs Supabase Edge Functions', () => {
  assert.match(deployScript, /ALIYUN_SUPABASE_FUNCTIONS_ROOT/);
  assert.match(deployScript, /functions\.tgz/);
  assert.match(deployScript, /supabase\/functions/);
  assert.match(deployScript, /function_name/);
  assert.match(deployScript, /ALIYUN_EDGE_FUNCTION_CONTAINER_CANDIDATES/);
  assert.match(deployScript, /functions/);
});

test('Aliyun deploy reads local env files before requiring deployment settings', () => {
  assert.match(deployScript, /parseEnvFile/);
  assert.match(deployScript, /envValue/);
  assert.match(deployScript, /join\(root, '\.env'\)/);
  assert.match(deployScript, /process\.env\[key\] \?\? envFile\[key\]/);
});

test('Aliyun deploy keeps deployment paths out of public defaults', () => {
  assert.match(deployScript, /siteRoot: envValue\('ALIYUN_SITE_ROOT'\)/);
  assert.match(deployScript, /functionsRoot: envValue\('ALIYUN_SUPABASE_FUNCTIONS_ROOT'\)/);
  assert.match(deployScript, /ALIYUN_SITE_ROOT is required/);
  assert.match(deployScript, /ALIYUN_SUPABASE_FUNCTIONS_ROOT is required/);
  assert.match(deployScript, /ALIYUN_USER is required/);
  assert.match(deployScript, /user: envValue\('ALIYUN_USER'\)/);
  assert.match(deployScript, /sshKey: envValue\('ALIYUN_SSH_KEY'\)/);
  assert.doesNotMatch(deployScript, /siteRoot: envValue\('ALIYUN_SITE_ROOT',/);
  assert.doesNotMatch(deployScript, /functionsRoot: envValue\('ALIYUN_SUPABASE_FUNCTIONS_ROOT',/);
  assert.doesNotMatch(deployScript, /user: envValue\('ALIYUN_USER',/);
  assert.doesNotMatch(deployScript, new RegExp(['id', 'rsa'].join('_')));
});

test('Aliyun deploy keeps server topology out of public defaults', () => {
  for (const key of [
    'ALIYUN_NGINX_COMPRESSION_CONF',
    'ALIYUN_NGINX_SITE_CONFIG',
    'ALIYUN_NGINX_CONFIG_BACKUP_ROOT',
    'ALIYUN_STORAGE_CACHE_LOCATION',
    'ALIYUN_STORAGE_PROXY_TARGET',
    'ALIYUN_EDGE_FUNCTION_CONTAINER_CANDIDATES',
  ]) {
    assert.match(deployScript, new RegExp(`envValue\\('${key}'\\)`));
  }

  assert.doesNotMatch(deployScript, /\/etc\/nginx/);
  assert.doesNotMatch(deployScript, /\/root\/nginx/);
  assert.doesNotMatch(deployScript, /127\.0\.0\.1:8000/);
  assert.doesNotMatch(deployScript, /EDGE_FUNCTION_CONTAINER_CANDIDATES="/);
});

test('Aliyun deploy strips macOS metadata from frontend and function archives', () => {
  assert.match(deployScript, /stripBuildMetadata/);
  assert.match(deployScript, /\['dist', 'supabase\/functions'\]/);
  assert.match(deployScript, /\['--no-xattrs', '-C', root, '-czf', archivePath, 'dist'\]/);
  assert.match(deployScript, /\['--no-xattrs', '-C', root, '-czf', functionsArchivePath, 'supabase\/functions'\]/);
  assert.match(deployScript, /xattr/);
});

test('Aliyun deploy runs runtime doctor after remote deployment unless explicitly skipped', () => {
  assert.match(deployScript, /skipRuntimeDoctor/);
  assert.match(deployScript, /--skip-runtime-doctor/);
  assert.match(deployScript, /aliyun-runtime-doctor\.mjs/);
  assert.match(deployScript, /--strict/);
  assert.match(deployScript, /Running Aliyun runtime doctor after deploy/);
});

test('Aliyun deploy waits for the restarted Edge Functions container healthcheck', () => {
  assert.match(deployScript, /docker restart "\$container_name"/);
  assert.match(deployScript, /docker inspect -f '\{\{if \.State\.Health\}\}\{\{\.State\.Health\.Status\}\}/);
  assert.match(deployScript, /\[ "\$health" = "healthy" \] && break/);
  assert.match(deployScript, /sleep 2/);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const launchReadinessSource = readFileSync(
  new URL('../src/lib/adminLaunchReadiness.js', import.meta.url),
  'utf8',
);
const adminSettingsSource = readFileSync(
  new URL('../src/features/admin/AdminSettingsSections.jsx', import.meta.url),
  'utf8',
);
const adminVisibleCopySource = [
  '../src/features/admin/AdminImagesTab.jsx',
  '../src/features/admin/AdminSettingsTab.jsx',
  '../src/features/admin/AdminSettingsSections.jsx',
  '../src/features/admin/AdminUsersTab.jsx',
  '../src/lib/adminAbuse.js',
  '../src/lib/adminAuthSignals.js',
  '../src/lib/adminBackup.js',
  '../src/lib/adminHealth.js',
  '../src/lib/adminLaunchReadiness.js',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');

test('launch readiness copy avoids implementation terms on the admin page', () => {
  const userFacingSource = `${launchReadinessSource} ${adminSettingsSource}`;
  for (const technicalTerm of [
    'share-memory',
    'Edge Function',
    'PUBLIC_SITE_URL',
    'VITE_',
    'npm run',
    '<id>',
    'site_url',
    'redirect URLs',
    'Auth Site URL',
    'Auth 配置',
    'Auth 策略',
    'Supabase Auth',
    'Supabase Storage',
    'Storage bucket',
    'bucket',
    '前端',
    '服务端',
    'Site URL',
    'Redirect URLs',
    '环境变量',
  ]) {
    assert.equal(adminVisibleCopySource.includes(technicalTerm), false, technicalTerm);
  }
});

test('admin settings cards do not render code-styled values', () => {
  assert.equal(adminSettingsSource.includes('<code>'), false);
  assert.equal(adminSettingsSource.includes('</code>'), false);
});

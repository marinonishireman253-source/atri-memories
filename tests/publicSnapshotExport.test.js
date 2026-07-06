import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  analyzePublicSnapshotEntries,
  findPublicSnapshotLeaks,
  isPublicSnapshotPath,
  publicSnapshotFileMode,
} from '../scripts/public-snapshot-export.mjs';

test('public snapshot export excludes internal planning artifacts', () => {
  assert.equal(isPublicSnapshotPath('src/features/admin/admin.css'), true);
  assert.equal(isPublicSnapshotPath('docs/PUBLIC_REPO_WORKFLOW.md'), true);
  assert.equal(isPublicSnapshotPath('docs/superpowers/plans/2026-07-03-gallery-css-split.md'), false);
  assert.equal(isPublicSnapshotPath('docs/superpowers/specs/2026-07-02-flow-doctor-design.md'), false);
  assert.equal(isPublicSnapshotPath('output/playwright/current-public-home-desktop.png'), false);
  assert.equal(isPublicSnapshotPath('.env.local'), false);
});

test('public snapshot leak scan allows placeholders and documentation ranges', () => {
  const content = [
    'ALIYUN_HOST=your-server-host',
    'VITE_SUPABASE_URL=https://your-project-ref.supabase.co',
    'host deploy@203.0.113.10:22022',
    '/Users/example/.codex/sessions/example.jsonl',
  ].join('\n');

  assert.deepEqual(findPublicSnapshotLeaks({ path: 'README.md', content }), []);
});

test('public snapshot leak scan blocks concrete local and network details', () => {
  const localPath = ['', 'Users', 'private-user', '.config', 'superpowers', 'worktrees', 'ATRI网站', 'main'].join('/');
  const publicIp = ['8', '8', '8', '8'].join('.');
  const supabaseUrl = `https://${'notarealprojectrefxx'}.supabase.co`;
  const content = [
    `debug path ${localPath}`,
    `temporary login ssh -p 22022 deploy@${publicIp}`,
    `VITE_SUPABASE_URL=${supabaseUrl}`,
  ].join('\n');

  const leaks = findPublicSnapshotLeaks({ path: 'docs/debug.md', content });

  assert.deepEqual(leaks.map((leak) => leak.type), ['local_path', 'ssh_command', 'public_host', 'supabase_project']);
});

test('public snapshot analysis reports excluded files and leak blockers', () => {
  const excludedLocalPath = ['', 'Users', 'private-user', 'private-plan'].join('/');
  const leakyPublicIp = ['8', '8', '8', '8'].join('.');
  const analysis = analyzePublicSnapshotEntries([
    { path: 'README.md', content: 'ALIYUN_HOST=your-server-host' },
    { path: 'src/App.jsx', content: 'export default function App() { return null; }' },
    { path: 'docs/superpowers/plans/internal.md', content: excludedLocalPath },
    { path: 'docs/leaky.md', content: `server ${leakyPublicIp}` },
  ]);

  assert.equal(analysis.included.length, 3);
  assert.equal(analysis.excluded.length, 1);
  assert.deepEqual(analysis.leaks.map((leak) => `${leak.path}:${leak.type}`), ['docs/leaky.md:public_host']);
});

test('public snapshot export preserves executable file bits', () => {
  assert.equal(publicSnapshotFileMode(0o100755), 0o755);
  assert.equal(publicSnapshotFileMode(0o100644), 0o644);
});

test('package scripts expose public snapshot export commands', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

  assert.equal(packageJson.scripts['public:snapshot:export'], 'node scripts/public-snapshot-export.mjs');
  assert.equal(packageJson.scripts['public:snapshot:export:test'], 'node --test tests/publicSnapshotExport.test.js');
  assert.match(packageJson.scripts['project:check'], /npm run public:snapshot:export:test/);
});

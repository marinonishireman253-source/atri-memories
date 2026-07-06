import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('..', import.meta.url);

function read(path) {
  return readFileSync(new URL(path, root), 'utf8');
}

function lineCount(content) {
  return content.split('\n').length;
}

const expectedImports = [
  '@import "./styles/admin-shell.css";',
  '@import "./styles/admin-overview.css";',
  '@import "./styles/admin-controls.css";',
  '@import "./styles/admin-settings.css";',
  '@import "./styles/admin-tables.css";',
  '@import "./styles/admin-anime-overrides.css";',
  '@import "./styles/admin-responsive.css";',
];

const splitFiles = [
  ['src/features/admin/styles/admin-shell.css', 320, ['.admin-page-shell', '.admin-console-hero', '.admin-disclosure']],
  ['src/features/admin/styles/admin-overview.css', 470, ['.admin-demo-summary', '.overview-grid article', '.health-check']],
  ['src/features/admin/styles/admin-controls.css', 230, ['.admin-toolbar', '.admin-user-segments', '.invite-form']],
  ['src/features/admin/styles/admin-settings.css', 330, ['.settings-panel', '.backup-asset-grid', '.auth-config-grid']],
  ['src/features/admin/styles/admin-tables.css', 230, ['.admin-table', '.user-role', '.admin-thumb']],
  ['src/features/admin/styles/admin-anime-overrides.css', 380, ['Anime Cel-Shaded Style Overrides', '.admin-panel input', '.admin-config-value']],
  ['src/features/admin/styles/admin-responsive.css', 80, ['@media (max-width: 760px)', '.admin-demo-summary-grid']],
];

test('admin css entry imports focused style modules in cascade order', () => {
  const stylesEntry = read('src/styles.css');
  const adminEntry = read('src/features/admin/admin.css');
  const entryLines = adminEntry.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  assert.match(stylesEntry, /@import "\.\/features\/admin\/admin\.css";/);
  assert.deepEqual(entryLines, expectedImports);
  assert.ok(lineCount(adminEntry) <= 20, 'admin.css should stay a small import-only entry');
});

test('admin split css files exist with bounded responsibilities', () => {
  const combined = splitFiles.map(([file, maxLines, selectors]) => {
    assert.equal(existsSync(new URL(file, root)), true, `${file} should exist`);
    const content = read(file);
    assert.ok(lineCount(content) <= maxLines, `${file} should stay at or below ${maxLines} lines`);
    for (const selector of selectors) {
      assert.ok(content.includes(selector), `${file} should include ${selector}`);
    }
    return content;
  }).join('\n');

  assert.ok(combined.includes('100dvh'));
  assert.ok(combined.includes('.backup-plan-grid'));
});

test('project check runs the admin style boundary test', () => {
  const packageJson = JSON.parse(read('package.json'));

  assert.equal(packageJson.scripts['admin-style:test'], 'node --test tests/adminStyleBoundary.test.js');
  assert.match(packageJson.scripts['project:check'], /npm run admin-style:test/);
});

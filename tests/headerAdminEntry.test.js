import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const headerSource = readFileSync(new URL('../src/components/Header.jsx', import.meta.url), 'utf8');

test('admin users get a visible top-level management entry', () => {
  assert.match(headerSource, /isAdmin && \(\s*<button className="site-action primary admin-entry"/s);
  assert.match(headerSource, /onClick=\{\(\) => runMenuAction\(onOpenAdmin\)\}/);
  assert.match(headerSource, />\s*管理后台\s*<\/button>/);
});

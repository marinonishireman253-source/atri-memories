import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { normalizePagePath } from '../src/app/pageRouting.js';

const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const homeModelSource = readFileSync(new URL('../src/app/useHomePageModel.js', import.meta.url), 'utf8');
const adminRouteSource = readFileSync(new URL('../src/app/AdminPageRoute.jsx', import.meta.url), 'utf8');
const adminPanelSource = readFileSync(new URL('../src/features/admin/AdminPanel.jsx', import.meta.url), 'utf8');

test('admin has its own route outside the public navigation list', () => {
  assert.equal(normalizePagePath('/admin'), '/admin');
  assert.equal(normalizePagePath('/admin?tab=users'), '/admin');
  assert.match(appSource, /const AdminPageRoute = lazy/);
  assert.match(appSource, /import\('\.\/app\/AdminPageRoute\.jsx'\)/);
  assert.match(appSource, /path === '\/admin'/);
});

test('admin header entry navigates to the standalone admin page', () => {
  assert.match(homeModelSource, /navigateToPage\?\.\('\/admin'\)/);
  assert.doesNotMatch(homeModelSource, /requestGalleryOverlay\('admin'\)/);
});

test('admin route renders a page variant instead of the old modal overlay', () => {
  assert.match(adminRouteSource, /className="admin-page-shell"/);
  assert.match(adminRouteSource, /variant="page"/);
  assert.match(adminPanelSource, /variant = 'modal'/);
  assert.match(adminPanelSource, /admin-page-panel/);
});

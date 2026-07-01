import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  MOBILE_LAYOUT_ROUTES,
  MOBILE_LAYOUT_VIEWPORTS,
  assertRouteMetrics,
  formatRouteLabel,
  hasHorizontalOverflow,
} from '../scripts/mobile-layout-check.mjs';

test('defines focused mobile routes for core public pages', () => {
  assert.deepEqual(
    MOBILE_LAYOUT_ROUTES.map((route) => route.path),
    ['/', '/gallery', '/blog', '/case-study', '/admin'],
  );
});

test('mobile layout check opens admin as a demo administrator', () => {
  const adminRoute = MOBILE_LAYOUT_ROUTES.find((route) => route.path === '/admin');

  assert.equal(adminRoute?.demoSession, 'admin');
  assert.equal(adminRoute?.readySelector, '.admin-page-shell');
  assert.deepEqual(adminRoute?.keySelectors, ['.site-header', '.admin-page-shell', '.admin-tabs']);
});

test('mobile layout screenshots wait for the boot intro to clear', () => {
  const source = readFileSync(new URL('../scripts/mobile-layout-check.mjs', import.meta.url), 'utf8');

  assert.match(source, /waitForBootIntroToFinish/);
  assert.match(source, /locator\('#boot-intro'\)\.waitFor\(\{ state: 'hidden'/);
});

test('defines phone-sized regression viewports', () => {
  assert.deepEqual(
    MOBILE_LAYOUT_VIEWPORTS.map((viewport) => `${viewport.width}x${viewport.height}`),
    ['360x740', '390x844'],
  );
});

test('formats route labels for readable failures', () => {
  assert.equal(formatRouteLabel({ path: '/', name: '首页' }), '首页 /');
  assert.equal(formatRouteLabel({ path: '/blog', name: '博客' }), '博客 /blog');
});

test('detects horizontal overflow with a small tolerance', () => {
  assert.equal(hasHorizontalOverflow({ scrollWidth: 391, clientWidth: 390 }), false);
  assert.equal(hasHorizontalOverflow({ scrollWidth: 398, clientWidth: 390 }), true);
});

test('rejects route metrics with overflow or missing key content', () => {
  assert.deepEqual(
    assertRouteMetrics({
      route: { path: '/', name: '首页' },
      viewport: { width: 390, height: 844, name: 'phone' },
      metrics: {
        scrollWidth: 390,
        clientWidth: 390,
        bodyWidth: 390,
        visibleKeyElements: 1,
        keyElementCount: 1,
        pageHeight: 1200,
      },
    }),
    [],
  );

  const failures = assertRouteMetrics({
    route: { path: '/gallery', name: '相册' },
    viewport: { width: 390, height: 844, name: 'phone' },
    metrics: {
      scrollWidth: 420,
      clientWidth: 390,
      bodyWidth: 390,
      visibleKeyElements: 0,
      keyElementCount: 1,
      pageHeight: 1200,
    },
  });

  assert.equal(failures.length, 2);
  assert.match(failures[0], /横向溢出/);
  assert.match(failures[1], /关键元素不可见/);
});

test('project check rebuilds the mobile demo bundle instead of reusing a prior dist', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const projectCheck = packageJson.scripts['project:check'] || '';

  assert.match(projectCheck, /npm run mobile:check\b/);
  assert.doesNotMatch(projectCheck, /mobile:check -- --skip-build/);
});

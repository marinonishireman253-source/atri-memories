import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const smokeScript = readFileSync(new URL('../scripts/smoke-check.mjs', import.meta.url), 'utf8');
const adminChrome = readFileSync(new URL('../src/features/admin/AdminChrome.jsx', import.meta.url), 'utf8');
const adminMemoriesHook = readFileSync(new URL('../src/hooks/useAdminMemories.js', import.meta.url), 'utf8');

test('authenticated admin smoke waits for the standalone admin page', () => {
  assert.equal(adminChrome.includes('<h2 id="admin-title">ATRI 管理室</h2>'), true);
  assert.equal(smokeScript.includes("page.waitForURL(`http://127.0.0.1:${connectedPort}/admin`"), true);
  assert.equal(smokeScript.includes("locator('.admin-page-panel')"), true);
  assert.equal(smokeScript.includes("getByText('上线准备', { exact: true })"), true);
  assert.equal(smokeScript.includes("locator('.gallery-desktop-controls .gallery-scope-bar .scope-pill.active').filter({ hasText: '我的图片' })"), true);
  assert.equal(smokeScript.includes("locator('.gallery-scope-bar .scope-pill.active').filter({ hasText: '我的图片' })"), false);
});

test('authenticated smoke waits for current signed-in header controls', () => {
  assert.equal(smokeScript.includes("async function waitForSignedInHeader"), true);
  assert.equal(smokeScript.includes("locator('.site-user-menu summary')"), true);
  assert.equal(smokeScript.includes("locator('.home-actions')"), false);
  assert.equal(smokeScript.includes("getByRole('button', { name: '我的图片' })"), false);
});

test('authenticated smoke surfaces login form failures', () => {
  assert.equal(smokeScript.includes('atri-auth-failure'), true);
  assert.equal(smokeScript.includes('登录失败：'), true);
});

test('browser smoke bypasses the local system proxy', () => {
  assert.equal(smokeScript.includes("'--no-proxy-server'"), true);
});

test('browser smoke uses bounded Playwright waits', () => {
  assert.equal(smokeScript.includes('SMOKE_ACTION_TIMEOUT_MS'), true);
  assert.equal(smokeScript.includes('configureSmokeTimeouts'), true);
  assert.equal(smokeScript.includes('setDefaultTimeout'), true);
  assert.equal(smokeScript.includes('setDefaultNavigationTimeout'), true);
});

test('admin image smoke can render rows when media URL hydration stalls', () => {
  assert.equal(adminMemoriesHook.includes('ADMIN_MEDIA_HYDRATION_TIMEOUT_MS'), true);
  assert.equal(adminMemoriesHook.includes('hydrateAdminMemoryRows'), true);
  assert.equal(adminMemoriesHook.includes('Promise.race'), true);
});

test('admin image loading retries when the manage-memories request stalls', () => {
  assert.equal(adminMemoriesHook.includes('ADMIN_MEMORY_REQUEST_TIMEOUT_MS'), true);
  assert.equal(adminMemoriesHook.includes('invokeManageMemories'), true);
  assert.equal(adminMemoriesHook.includes('manage-memories'), true);
  assert.equal(adminMemoriesHook.includes('attempt <= 1'), true);
});

test('public smoke covers the case study route', () => {
  assert.equal(smokeScript.includes("getByRole('link', { name: '项目' })"), true);
  assert.equal(smokeScript.includes("getByRole('heading', { name: '项目案例' })"), true);
  assert.equal(smokeScript.includes("getByText('权限模型', { exact: true })"), true);
  assert.equal(smokeScript.includes("getByText('部署与验证', { exact: true })"), true);
  assert.equal(smokeScript.includes("getByText('npm run verify', { exact: true })"), true);
  assert.equal(smokeScript.includes("getByLabel('产品浏览路径')"), true);
  assert.equal(smokeScript.includes("caseStudy: 'passed'"), true);
  assert.equal(smokeScript.includes("smoke-case-study.png"), true);
  assert.equal(smokeScript.includes("smoke-mobile-case-study.png"), true);
});

test('authenticated admin smoke verifies the admin demo summary path', () => {
  assert.equal(smokeScript.includes("getByText('运营管理路径', { exact: true })"), true);
  assert.equal(smokeScript.includes("getByText('内容运营', { exact: true })"), true);
  assert.equal(smokeScript.includes("getByText('账号权限', { exact: true })"), true);
  assert.equal(smokeScript.includes("getByText('治理队列', { exact: true })"), true);
});

test('public smoke verifies viewer portal and custom cursor stacking in a real browser', () => {
  assert.equal(smokeScript.includes('async function assertViewerOverlayPortal'), true);
  assert.equal(smokeScript.includes("overlay.parentElement === document.body"), true);
  assert.equal(smokeScript.includes("cursor.parentElement === document.body"), true);
  assert.equal(smokeScript.includes("Number.parseInt(cursorStyle.zIndex"), true);
});

test('authenticated admin smoke opens image management viewer from the standalone admin page', () => {
  assert.equal(smokeScript.includes("getByRole('button', { name: '图片管理', exact: true })"), true);
  assert.equal(smokeScript.includes("getByRole('button', { name: '用户管理', exact: true })"), true);
  assert.equal(smokeScript.includes("getByRole('button', { name: '站点设置', exact: true })"), true);
  assert.equal(smokeScript.includes("getByRole('button', { name: '查看/编辑' })"), true);
  assert.equal(smokeScript.includes('smoke-admin-image-viewer.png'), true);
});

test('authenticated admin image smoke reports page state when rows do not appear in time', () => {
  assert.equal(smokeScript.includes('async function waitForAdminImageEditor'), true);
  assert.equal(smokeScript.includes('ADMIN_IMAGE_EDITOR_TIMEOUT_MS'), true);
  assert.equal(smokeScript.includes('后台图片管理未出现可编辑图片'), true);
  assert.equal(smokeScript.includes('rowCount'), true);
  assert.equal(smokeScript.includes('admin-message'), true);
  assert.equal(smokeScript.includes('functionEvents'), true);
  assert.equal(smokeScript.includes('/functions/v1/'), true);
});

test('memory cards expose stable gallery image diagnostics attributes', () => {
  const memoryCardSource = readFileSync(new URL('../src/features/gallery/MemoryCard.jsx', import.meta.url), 'utf8');

  assert.equal(memoryCardSource.includes('data-memory-id={memory.id}'), true);
  assert.equal(memoryCardSource.includes('data-gallery-image-src={imageSrc}'), true);
  assert.equal(memoryCardSource.includes('data-gallery-fallback-src={fallbackImageSrc}'), true);
});

test('public smoke records gallery image loading diagnostics', () => {
  const diagnosticsFunctionIndex = smokeScript.indexOf('function writeGalleryImageDiagnostics');
  const assertDiagnosticsIndex = smokeScript.indexOf('async function assertGalleryImageDiagnostics');
  const assertDiagnosticsEndIndex = smokeScript.indexOf('\nasync function verifyLocalSite', assertDiagnosticsIndex);
  const assertDiagnosticsSource = smokeScript.slice(assertDiagnosticsIndex, assertDiagnosticsEndIndex);
  const pushDiagnosticsIndex = assertDiagnosticsSource.indexOf('galleryImageDiagnostics.push(diagnostics);');
  const writeDiagnosticsIndex = assertDiagnosticsSource.indexOf('writeGalleryImageDiagnostics();');
  const readyTimeoutIndex = assertDiagnosticsSource.indexOf("fail(`${label} 等待图片加载超时");
  const failedRequestsIndex = assertDiagnosticsSource.indexOf("fail(`${label} 存在失败图片请求");
  const insufficientReadyIndex = assertDiagnosticsSource.indexOf("fail(`${label} 可见图片未完成加载");

  assert.equal(smokeScript.includes('smoke-gallery-image-diagnostics.json'), true);
  assert.notEqual(diagnosticsFunctionIndex, -1);
  assert.equal(smokeScript.includes('async function assertGalleryImageDiagnostics'), true);
  assert.equal(smokeScript.includes('trackGalleryImageFailures'), true);
  assert.equal(smokeScript.includes('galleryImageDiagnostics'), true);
  assert.equal(smokeScript.includes('visibleReadyCards'), true);
  assert.equal(smokeScript.includes('failedImageRequests'), true);
  assert.equal(assertDiagnosticsSource.includes('readyWaitTimedOut: Boolean(readyWaitError)'), true);
  assert.notEqual(pushDiagnosticsIndex, -1);
  assert.notEqual(writeDiagnosticsIndex, -1);
  assert.notEqual(readyTimeoutIndex, -1);
  assert.equal(writeDiagnosticsIndex > pushDiagnosticsIndex, true);
  assert.equal(writeDiagnosticsIndex < readyTimeoutIndex, true);
  assert.equal(writeDiagnosticsIndex < failedRequestsIndex, true);
  assert.equal(writeDiagnosticsIndex < insufficientReadyIndex, true);
});

test('public smoke scopes gallery scope bar selectors for duplicate desktop and mobile controls', () => {
  assert.equal(smokeScript.includes("page.getByLabel('当前画廊范围')"), false);
  assert.equal(smokeScript.includes("page.getByPlaceholder('按标题、描述、标签或上传者查找')"), false);
  assert.equal(smokeScript.includes("page.getByLabel('标签筛选')"), false);
  assert.equal(
    smokeScript.includes(
      "page.locator('.gallery-desktop-controls').getByLabel('当前画廊范围')",
    ),
    true,
  );
  assert.equal(
    smokeScript.includes(
      "page.locator('.gallery-desktop-controls').getByPlaceholder('按标题、描述、标签或上传者查找')",
    ),
    true,
  );
  assert.equal(
    smokeScript.includes("page.locator('.gallery-desktop-controls').getByLabel('标签筛选')"),
    true,
  );
  assert.equal(
    smokeScript.includes(
      "page.getByLabel('移动相册筛选').getByPlaceholder('按标题、描述、标签或上传者查找')",
    ),
    true,
  );
  assert.equal(
    smokeScript.includes(
      "page.getByLabel('移动相册筛选').getByLabel('当前画廊范围')",
    ),
    false,
  );
});

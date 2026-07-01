import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const smokeScript = readFileSync(new URL('../scripts/smoke-check.mjs', import.meta.url), 'utf8');
const adminChrome = readFileSync(new URL('../src/features/admin/AdminChrome.jsx', import.meta.url), 'utf8');

test('authenticated admin smoke waits for the standalone admin page', () => {
  assert.equal(adminChrome.includes('<h2 id="admin-title">ATRI 管理室</h2>'), true);
  assert.equal(smokeScript.includes("page.waitForURL(`http://127.0.0.1:${connectedPort}/admin`"), true);
  assert.equal(smokeScript.includes("locator('.admin-page-panel')"), true);
  assert.equal(smokeScript.includes("getByText('上线准备', { exact: true })"), true);
  assert.equal(smokeScript.includes("locator('.gallery-scope-bar .scope-pill.active').filter({ hasText: '我的图片' })"), true);
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

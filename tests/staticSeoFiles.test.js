import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const robotsPath = new URL('../public/robots.txt', import.meta.url);
const sitemapPath = new URL('../public/sitemap.xml', import.meta.url);

function readRequiredFile(path, label) {
  assert.equal(existsSync(path), true, `${label} should exist in public/`);
  return readFileSync(path, 'utf8');
}

test('robots.txt points crawlers to the public sitemap instead of the SPA shell', () => {
  const robotsTxt = readRequiredFile(robotsPath, 'robots.txt');

  assert.match(robotsTxt, /^User-agent: \*$/m);
  assert.match(robotsTxt, /^Allow: \/$/m);
  assert.match(robotsTxt, /^Sitemap: https:\/\/atriroom\.com\/sitemap\.xml$/m);
  assert.doesNotMatch(robotsTxt, /<!doctype html/i);
});

test('sitemap.xml lists the public ATRI routes with absolute URLs', () => {
  const sitemapXml = readRequiredFile(sitemapPath, 'sitemap.xml');

  for (const route of ['/', '/gallery', '/daily', '/blog', '/case-study']) {
    assert.match(sitemapXml, new RegExp(`<loc>https://atriroom\\.com${route === '/' ? '/' : route}</loc>`));
  }

  assert.match(sitemapXml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.doesNotMatch(sitemapXml, /<!doctype html/i);
});

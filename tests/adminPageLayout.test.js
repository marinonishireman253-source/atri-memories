import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const adminCssUrl = new URL('../src/features/admin/admin.css', import.meta.url);

function readCssWithImports(url) {
  const css = readFileSync(url, 'utf8');
  const imports = [...css.matchAll(/^@import\s+"(?<path>[^"]+)";$/gm)];

  if (!imports.length) return css;

  return imports.map((item) => readFileSync(new URL(item.groups.path, url), 'utf8')).join('\n');
}

const adminCss = readCssWithImports(adminCssUrl);

function cssBlock(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = adminCss.match(new RegExp(`${escaped}\\s*\\{(?<body>[^}]+)\\}`));
  return match?.groups?.body ?? '';
}

test('standalone admin page frame is wide and grows with page content', () => {
  const genericPanelIndex = adminCss.indexOf('.admin-panel {');
  const pagePanelIndex = adminCss.indexOf('.admin-page-panel.admin-panel');
  const pagePanelBlock = cssBlock('.admin-page-panel.admin-panel');
  const pageShellBlock = cssBlock('.admin-page-shell');

  assert.ok(pagePanelIndex > genericPanelIndex, 'page panel override should come after generic panel rules');
  assert.match(pagePanelBlock, /width:\s*100%/);
  assert.match(pagePanelBlock, /max-height:\s*none/);
  assert.match(pagePanelBlock, /overflow:\s*visible/);
  assert.match(pageShellBlock, /1480px/);
  assert.match(pageShellBlock, /100%\s*-\s*32px/);
});

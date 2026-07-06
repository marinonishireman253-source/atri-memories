import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appOverlaysSource = readFileSync(new URL('../src/app/AppOverlays.jsx', import.meta.url), 'utf8');

test('app overlays render through a body portal so fixed dialogs are viewport anchored', () => {
  assert.match(appOverlaysSource, /from 'react-dom'/);
  assert.match(appOverlaysSource, /createPortal/);
  assert.match(appOverlaysSource, /document\.body/);
  assert.match(appOverlaysSource, /return\s+createPortal\(\s*overlayContent,\s*document\.body\s*\)/);
});

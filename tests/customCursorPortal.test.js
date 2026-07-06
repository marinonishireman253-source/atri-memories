import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const customCursorSource = readFileSync(new URL('../src/app/CustomCursor.jsx', import.meta.url), 'utf8');

test('custom cursor renders through a body portal so it stays above body-level overlays', () => {
  assert.match(customCursorSource, /from 'react-dom'/);
  assert.match(customCursorSource, /createPortal/);
  assert.match(customCursorSource, /document\.body/);
  assert.match(customCursorSource, /return\s+createPortal\(\s*cursorContent,\s*document\.body\s*\)/);
});

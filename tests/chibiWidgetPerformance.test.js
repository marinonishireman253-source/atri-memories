import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const chibiSource = readFileSync(new URL('../src/app/ChibiWidget.jsx', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('chibi widget skips mounting on compact touch viewports', () => {
  assert.match(chibiSource, /canShowChibi/);
  assert.match(chibiSource, /matchMedia\('\(max-width: 600px\)'\)/);
  assert.match(chibiSource, /matchMedia\('\(pointer: coarse\)'\)/);
  assert.match(chibiSource, /if \(!canShowChibi\) return null;/);
});

test('performance checks are part of the project gate', () => {
  assert.match(packageJson.scripts['performance:test'], /heroPerformance\.test\.js/);
  assert.match(packageJson.scripts['performance:test'], /chibiWidgetPerformance\.test\.js/);
  assert.match(packageJson.scripts['project:check'], /npm run performance:test/);
});

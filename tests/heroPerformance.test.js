import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const heroSource = readFileSync(new URL('../src/components/Hero.jsx', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('home hero serves smaller mobile artwork through responsive picture sources', () => {
  const desktopBackground = join(root, 'src/assets/official-hero/atri-bg-plate.webp');
  const desktopForeground = join(root, 'src/assets/official-hero/atri-foreground.webp');
  const mobileBackground = join(root, 'src/assets/official-hero/atri-bg-plate-mobile.webp');
  const mobileForeground = join(root, 'src/assets/official-hero/atri-foreground-mobile.webp');

  assert.equal(existsSync(mobileBackground), true);
  assert.equal(existsSync(mobileForeground), true);
  assert.equal(statSync(mobileBackground).size < statSync(desktopBackground).size, true);
  assert.equal(statSync(mobileForeground).size < statSync(desktopForeground).size, true);
  assert.match(heroSource, /heroBackgroundMobile/);
  assert.match(heroSource, /heroForegroundMobile/);
  assert.match(heroSource, /<picture className="official-kv-background-picture">/);
  assert.match(heroSource, /media="\(max-width: 900px\)"/);
});

test('html preloads the correct hero artwork for mobile and desktop viewports', () => {
  assert.match(indexSource, /atri-bg-plate-mobile\.webp/);
  assert.match(indexSource, /atri-foreground-mobile\.webp/);
  assert.match(indexSource, /media="\(max-width: 900px\)"/);
  assert.match(indexSource, /media="\(min-width: 901px\)"/);
});

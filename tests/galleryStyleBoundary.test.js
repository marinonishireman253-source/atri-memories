import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('..', import.meta.url);

function read(path) {
  return readFileSync(new URL(path, root), 'utf8');
}

function lineCount(content) {
  return content.split('\n').length;
}

const expectedImports = [
  '@import "./styles/gallery-shell.css";',
  '@import "./styles/gallery-controls.css";',
  '@import "./styles/gallery-memory-card.css";',
  '@import "./styles/gallery-states.css";',
  '@import "./styles/gallery-responsive.css";',
];

const splitFiles = [
  ['src/features/gallery/styles/gallery-shell.css', 320, ['.gallery-panel', '.featured-card', '.gallery-header-controls']],
  ['src/features/gallery/styles/gallery-controls.css', 280, ['.gallery-tools', '.gallery-scope-bar', '.gallery-mobile-filter-panel']],
  ['src/features/gallery/styles/gallery-memory-card.css', 340, ['.gallery-grid', '.memory-card', '.memory-image-frame']],
  ['src/features/gallery/styles/gallery-states.css', 180, ['.spinner', '.loading-image', '.memory-offline-placeholder']],
  ['src/features/gallery/styles/gallery-responsive.css', 460, ['@media (max-width: 620px)', '@media (min-width: 1024px)', '@media (max-width: 1023px)']],
];

test('gallery css entry imports focused style modules in cascade order', () => {
  const stylesEntry = read('src/styles.css');
  const galleryEntry = read('src/features/gallery/gallery.css');
  const entryLines = galleryEntry.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  assert.match(stylesEntry, /@import "\.\/features\/gallery\/gallery\.css";/);
  assert.deepEqual(entryLines, expectedImports);
  assert.ok(lineCount(galleryEntry) <= 20, 'gallery.css should stay a small import-only entry');
});

test('gallery split css files exist with bounded responsibilities', () => {
  const combined = splitFiles.map(([file, maxLines, selectors]) => {
    assert.equal(existsSync(new URL(file, root)), true, `${file} should exist`);
    const content = read(file);
    assert.ok(lineCount(content) <= maxLines, `${file} should stay at or below ${maxLines} lines`);
    for (const selector of selectors) {
      assert.ok(content.includes(selector), `${file} should include ${selector}`);
    }
    return content;
  }).join('\n');

  assert.ok(combined.includes('@keyframes holographic-foil-sweep'));
  assert.ok(combined.includes('.gallery-panel > .gallery-grid'));
});

test('project check runs the gallery style boundary test', () => {
  const packageJson = JSON.parse(read('package.json'));

  assert.equal(packageJson.scripts['gallery-style:test'], 'node --test tests/galleryStyleBoundary.test.js');
  assert.match(packageJson.scripts['project:check'], /npm run gallery-style:test/);
});

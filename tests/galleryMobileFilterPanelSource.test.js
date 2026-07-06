import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const panelUrl = new URL('../src/features/gallery/GalleryMobileFilterPanel.jsx', import.meta.url);
const gallerySource = readFileSync(new URL('../src/features/gallery/Gallery.jsx', import.meta.url), 'utf8');

test('gallery wires a dedicated mobile filter panel', () => {
  assert.match(gallerySource, /GalleryMobileFilterPanel/);
  assert.match(gallerySource, /gallery-desktop-controls/);
  assert.doesNotMatch(gallerySource, /className="active-filter"/);
  assert.match(gallerySource, /Task 3 applies CSS gating for desktop\/mobile filter visibility/);
});

test('mobile filter panel keeps search visible and advanced filters collapsible', () => {
  assert.equal(existsSync(panelUrl), true);
  const source = readFileSync(panelUrl, 'utf8');

  assert.match(source, /gallery-mobile-filter-panel/);
  assert.match(source, /aria-label="移动相册筛选"/);
  assert.match(source, /type="search"/);
  assert.match(source, /aria-expanded=\{expanded\}/);
  assert.match(source, /aria-controls="gallery-mobile-advanced-filters"/);
  assert.match(source, /id="gallery-mobile-advanced-filters"/);
  assert.match(source, /hidden=\{!expanded\}/);
  assert.match(source, /GalleryFilters/);
  assert.match(source, /hideSearch/);
  assert.match(source, /GalleryScopeBar/);
  assert.match(source, /GalleryManageBar/);
  assert.match(source, /默认筛选/);
});

test('mobile filter CSS hides duplicate controls on phone viewports', () => {
  const css = readFileSync(new URL('../src/features/gallery/gallery.css', import.meta.url), 'utf8');

  assert.match(css, /\.gallery-mobile-filter-panel/);
  assert.match(css, /\.gallery-desktop-controls/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /\.gallery-mobile-advanced-filters\[hidden\]/);
});

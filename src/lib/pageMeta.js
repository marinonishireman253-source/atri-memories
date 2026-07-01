import { memoryMetaModel } from './memoryDetail.js';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_TYPE,
  DEFAULT_THEME_COLOR,
  DEFAULT_TITLE,
} from './siteMeta.js';

function ensureMeta(selector, createAttributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(createAttributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    document.head.append(element);
  }
  return element;
}

function setMetaContent(selector, createAttributes, content) {
  const element = ensureMeta(selector, createAttributes);
  element.setAttribute('content', content);
}

function removeMeta(selector) {
  const element = document.head.querySelector(selector);
  if (element) element.remove();
}

export function setDefaultPageMeta() {
  document.title = DEFAULT_TITLE;
  setMetaContent('meta[name="theme-color"]', { name: 'theme-color' }, DEFAULT_THEME_COLOR);
  setMetaContent('meta[name="description"]', { name: 'description' }, DEFAULT_DESCRIPTION);
  setMetaContent('meta[property="og:title"]', { property: 'og:title' }, DEFAULT_TITLE);
  setMetaContent('meta[property="og:description"]', { property: 'og:description' }, DEFAULT_DESCRIPTION);
  setMetaContent('meta[property="og:type"]', { property: 'og:type' }, DEFAULT_OG_TYPE);
  setMetaContent('meta[property="og:url"]', { property: 'og:url' }, window.location.origin);
  setMetaContent('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image');
  setMetaContent('meta[name="twitter:title"]', { name: 'twitter:title' }, DEFAULT_TITLE);
  setMetaContent('meta[name="twitter:description"]', { name: 'twitter:description' }, DEFAULT_DESCRIPTION);
  removeMeta('meta[property="og:image"]');
  removeMeta('meta[name="twitter:image"]');
}

export function setMemoryPageMeta(memory) {
  const meta = memoryMetaModel(memory);
  const title = meta.title;
  const description = meta.description || DEFAULT_DESCRIPTION;
  document.title = title;
  setMetaContent('meta[name="theme-color"]', { name: 'theme-color' }, DEFAULT_THEME_COLOR);
  setMetaContent('meta[name="description"]', { name: 'description' }, description);
  setMetaContent('meta[property="og:title"]', { property: 'og:title' }, title);
  setMetaContent('meta[property="og:description"]', { property: 'og:description' }, description);
  setMetaContent('meta[property="og:image"]', { property: 'og:image' }, meta.imageUrl);
  setMetaContent('meta[property="og:url"]', { property: 'og:url' }, meta.shareUrl);
  setMetaContent('meta[property="og:type"]', { property: 'og:type' }, DEFAULT_OG_TYPE);
  setMetaContent('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image');
  setMetaContent('meta[name="twitter:title"]', { name: 'twitter:title' }, title);
  setMetaContent('meta[name="twitter:description"]', { name: 'twitter:description' }, description);
  setMetaContent('meta[name="twitter:image"]', { name: 'twitter:image' }, meta.imageUrl);
}

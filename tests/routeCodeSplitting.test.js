import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('non-home routes are code-split out of the first app bundle', () => {
  for (const route of [
    'GalleryPageRoute',
    'DailyPageRoute',
    'BlogPageRoute',
    'CaseStudyPageRoute',
    'AdminPageRoute',
  ]) {
    assert.match(appSource, new RegExp(`const ${route} = lazy`));
  }

  assert.doesNotMatch(appSource, /import \{ GalleryPageRoute \} from/);
  assert.doesNotMatch(appSource, /import \{ DailyPageRoute \} from/);
  assert.doesNotMatch(appSource, /import \{ BlogPageRoute \} from/);
  assert.doesNotMatch(appSource, /import \{ CaseStudyPageRoute \} from/);
  assert.doesNotMatch(appSource, /import \{ AdminPageRoute \} from/);
  assert.match(appSource, /<Suspense fallback=\{null\}>/);
});

test('route splitting check is part of the performance gate', () => {
  assert.match(packageJson.scripts['performance:test'], /routeCodeSplitting\.test\.js/);
});

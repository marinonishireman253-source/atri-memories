import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const supabaseConfig = readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8');
const mediaUrlsSource = readFileSync(new URL('../supabase/functions/media-urls/index.ts', import.meta.url), 'utf8');

function tomlStringValue(source, key) {
  const match = source.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm'));
  return match?.[1] ?? '';
}

test('Supabase Auth primary site URL is not committed as a localhost redirect', () => {
  const siteUrl = tomlStringValue(supabaseConfig, 'site_url');

  assert.match(siteUrl, /^https:\/\//);
  assert.doesNotMatch(siteUrl, /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/);
});

test('media URL resolver treats the self-hosted Edge Functions container as internal', () => {
  assert.match(mediaUrlsSource, /normalized\s*===\s*'supabase-edge-functions'/);
});

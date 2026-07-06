import assert from 'node:assert/strict';
import test from 'node:test';

import { checkShareMemoryPreview } from '../scripts/share-preview-diagnostics.mjs';

test('share preview diagnostics confirms public site redirect from remote function output', async () => {
  const originalFetch = globalThis.fetch;
  const memoryId = 'fb3a35b5-0000-4000-9000-000000000000';
  const calls = [];

  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/rest/v1/memories')) {
      return new Response(JSON.stringify([{ id: memoryId }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(`
      <html>
        <head>
          <meta property="og:title" content="记忆" />
          <meta property="og:image" content="https://cdn.example/memory.webp" />
          <meta name="twitter:card" content="summary_large_image" />
          <link rel="canonical" href="https://supabase.example/functions/v1/share-memory?id=${memoryId}" />
        </head>
        <body>
          <span>服务端分享预览</span>
          <a class="button" href="https://atriroom.com/memory/${memoryId}">打开原站页面</a>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  };

  try {
    const result = await checkShareMemoryPreview({
      supabaseUrl: 'https://supabase.example',
      publishableKey: 'publishable-key',
      publicSiteUrl: 'https://atriroom.com',
    });

    assert.equal(result.ok, true);
    assert.equal(result.hasPublicSiteRedirect, true);
    assert.equal(result.publicSiteRedirectUrl, `https://atriroom.com/memory/${memoryId}`);
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

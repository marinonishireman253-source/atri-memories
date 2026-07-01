import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REDIRECT_DELAY_MS = 1200;
const CACHE_CONTROL = 'public, max-age=300';
const HTML_CONTENT_TYPE = 'text/html; charset=utf-8';
const MEMORY_VISIBILITY_PUBLIC = 'public';
const SITE_NAME = 'ATRI Memories';
const DEFAULT_TITLE = 'ATRI Memories';
const DEFAULT_DESCRIPTION = '在潮声、晚霞与你的照片之间，保存每一份不会褪色的心情。';
const DEFAULT_THEME_COLOR = '#0c3853';
const DEFAULT_OG_TYPE = 'website';

type MemoryRecord = {
  id: string;
  title: string;
  caption: string;
  image_url: string;
  storage_path: string;
  tags: string[];
  created_at: string;
  visibility_status: string;
};

function trimTrailingSlash(value = '') {
  return String(value).trim().replace(/\/+$/, '');
}

function isUuid(value: string | null) {
  return Boolean(value && ID_PATTERN.test(value));
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
}

function tagsToText(tags: unknown) {
  return normalizeTags(tags).join(' · ');
}

function normalizeMemory(row: Record<string, unknown> | null | undefined): MemoryRecord {
  return {
    id: String(row?.id ?? ''),
    title: String(row?.title ?? '').trim(),
    caption: String(row?.caption ?? '').trim(),
    image_url: String(row?.image_url ?? '').trim(),
    storage_path: String(row?.storage_path ?? '').trim(),
    tags: normalizeTags(row?.tags ?? []),
    created_at: String(row?.created_at ?? '').trim(),
    visibility_status: String(row?.visibility_status ?? '').trim(),
  };
}

function memoryTitle(memory: Partial<MemoryRecord> | null | undefined) {
  return String(memory?.title ?? '').trim() || '未命名记忆';
}

function memoryDescription(memory: Partial<MemoryRecord> | null | undefined, fallback = DEFAULT_DESCRIPTION) {
  const caption = String(memory?.caption ?? '').trim();
  if (caption) return caption;

  const tags = tagsToText(memory?.tags ?? []);
  if (tags) return `${memoryTitle(memory)} · ${tags}`;

  return fallback;
}

function publicSiteUrl() {
  return trimTrailingSlash(
    Deno.env.get('PUBLIC_SITE_URL')
      ?? Deno.env.get('VITE_PUBLIC_SITE_URL')
      ?? '',
  );
}

function memoryAppUrl(id: string) {
  const siteUrl = publicSiteUrl();
  if (!siteUrl) return '';
  return `${siteUrl}/memory/${id}`;
}

function functionBaseUrl() {
  const supabaseUrl = trimTrailingSlash(Deno.env.get('SUPABASE_URL') ?? '');
  if (!supabaseUrl) return '';
  return `${supabaseUrl}/functions/v1/share-memory`;
}

function shareRequestUrl(id: string | null = null) {
  const baseUrl = functionBaseUrl();
  if (!baseUrl) return '';
  if (!id) return baseUrl;
  return `${baseUrl}?id=${id}`;
}

function parseMemoryId(request: Request) {
  const url = new URL(request.url);
  const queryId = url.searchParams.get('id');
  if (isUuid(queryId)) return queryId!;

  const pathMatch = url.pathname.match(
    /\/functions\/v1\/share-memory\/([0-9a-f-]{36})\/?$/i,
  );
  return isUuid(pathMatch?.[1] ?? null) ? pathMatch![1] : null;
}

function htmlResponse(html: string, status = 200) {
  return new Response(new Blob([html], { type: HTML_CONTENT_TYPE }), {
    status,
    headers: {
      ...corsHeaders,
      'cache-control': CACHE_CONTROL,
      'x-content-type-options': 'nosniff',
    },
  });
}

function renderPage({
  title,
  description,
  imageUrl,
  requestUrl,
  canonicalUrl,
  redirectUrl,
  memory,
  missing,
}: {
  title: string;
  description: string;
  imageUrl: string;
  requestUrl: string;
  canonicalUrl: string;
  redirectUrl: string;
  memory?: Record<string, unknown> | null;
  missing?: boolean;
}) {
  const tagsText = memory ? tagsToText(memory.tags ?? []) : '';
  const createdAt = typeof memory?.created_at === 'string'
    ? new Date(memory.created_at).toLocaleDateString('zh-CN')
    : '';
  const previewMessage = redirectUrl
    ? `页面将在 ${Math.round(REDIRECT_DELAY_MS / 1000)} 秒后自动打开主站。`
    : '当前还没有配置公开站点域名，页面仅提供服务端分享预览。';
  const redirectScript = redirectUrl
    ? `<script>window.setTimeout(function () { window.location.replace(${JSON.stringify(redirectUrl)}); }, ${REDIRECT_DELAY_MS});</script>`
    : '';
  const refreshMeta = redirectUrl
    ? `<meta http-equiv="refresh" content="${Math.round(REDIRECT_DELAY_MS / 1000)};url=${escapeHtml(redirectUrl)}" />`
    : '';
  const bodyTitle = missing ? '记忆不存在或暂未公开' : escapeHtml(memoryTitle(memory));
  const bodyDescription = missing
    ? '这条分享预览当前无法打开。请确认图片仍然公开，或稍后重试。'
    : escapeHtml(memoryDescription(memory, description));
  const bodyImage = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(bodyTitle)}" />`
    : '<div class="placeholder">ATRI</div>';

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="${escapeHtml(DEFAULT_THEME_COLOR)}" />
    <meta name="robots" content="noindex, nofollow" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="${escapeHtml(DEFAULT_OG_TYPE)}" />
    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl || requestUrl)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl || requestUrl)}" />
    ${refreshMeta}
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: linear-gradient(180deg, #08243a 0%, #0c3853 100%);
        color: #17384c;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      .card {
        width: min(720px, 100%);
        display: grid;
        gap: 18px;
        padding: 24px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 30px 80px rgba(3, 20, 34, 0.25);
      }
      .eyebrow {
        margin: 0;
        color: #5a7b8e;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      .media {
        overflow: hidden;
        border-radius: 18px;
        background: rgba(7, 28, 42, 0.08);
      }
      .media img,
      .placeholder {
        display: block;
        width: 100%;
        min-height: 240px;
        object-fit: cover;
      }
      .placeholder {
        display: grid;
        place-items: center;
        color: #6a8495;
        font-size: 28px;
        font-weight: 700;
      }
      h1 {
        margin: 0;
        color: #15364a;
        font-size: clamp(1.4rem, 2vw, 2rem);
        line-height: 1.5;
      }
      p {
        margin: 0;
        color: #4d6776;
        font-size: 0.92rem;
        line-height: 1.8;
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(221, 241, 248, 0.88);
        color: #1c5d78;
        font-size: 0.78rem;
        font-weight: 700;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
      }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
        padding: 0 16px;
        border-radius: 12px;
        background: #188fb9;
        color: #fff;
        text-decoration: none;
        font-weight: 700;
      }
      .muted {
        color: #6a8495;
        font-size: 0.82rem;
      }
      code {
        display: block;
        padding: 12px;
        border-radius: 14px;
        background: rgba(231, 241, 246, 0.92);
        color: #244659;
        font-size: 0.76rem;
        overflow-wrap: anywhere;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <p class="eyebrow">${escapeHtml(SITE_NAME)} Share Preview</p>
      <div class="media">${bodyImage}</div>
      <div>
        <h1>${bodyTitle}</h1>
        <p>${bodyDescription}</p>
      </div>
      <div class="meta">
        ${createdAt ? `<span class="chip">${escapeHtml(createdAt)}</span>` : ''}
        ${tagsText ? `<span class="chip">${escapeHtml(tagsText)}</span>` : ''}
        ${memory ? `<span class="chip">服务端分享预览</span>` : ''}
      </div>
      <div class="actions">
        ${redirectUrl ? `<a class="button" href="${escapeHtml(redirectUrl)}">打开原站页面</a>` : ''}
        <span class="muted">${escapeHtml(previewMessage)}</span>
      </div>
      ${!redirectUrl ? `<code>请在部署环境中配置 PUBLIC_SITE_URL，服务端分享页才能自动回跳到主站 /memory/${escapeHtml(String(memory?.id ?? '...'))}</code>` : ''}
    </main>
    ${redirectScript}
  </body>
</html>`;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'GET') {
    return new Response('Method not allowed.', {
      status: 405,
      headers: corsHeaders,
    });
  }

  const memoryId = parseMemoryId(request);
  const requestUrl = shareRequestUrl(memoryId) || new URL(request.url).toString();

  if (!memoryId) {
    return htmlResponse(renderPage({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      imageUrl: '',
      requestUrl,
      canonicalUrl: shareRequestUrl() || requestUrl,
      redirectUrl: '',
      missing: true,
    }), 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: row, error } = await supabase
    .from('memories')
    .select('id, title, caption, image_url, storage_path, tags, created_at, visibility_status')
    .eq('id', memoryId)
    .eq('visibility_status', MEMORY_VISIBILITY_PUBLIC)
    .maybeSingle();

  if (error || !row) {
    return htmlResponse(renderPage({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      imageUrl: '',
      requestUrl,
      canonicalUrl: shareRequestUrl(memoryId) || requestUrl,
      redirectUrl: memoryAppUrl(memoryId),
      missing: true,
    }), 404);
  }

  const memory = normalizeMemory(row);
  let imageUrl = row.image_url || '';
  if (row.storage_path) {
    const { data: signed } = await supabase.storage
      .from('atri-images')
      .createSignedUrl(row.storage_path, 60 * 60);
    imageUrl = signed?.signedUrl || imageUrl;
  }

  const title = `${memoryTitle(memory)} | ${SITE_NAME}`;
  const description = memoryDescription(memory, DEFAULT_DESCRIPTION);
  const redirectUrl = memoryAppUrl(memoryId);

  return htmlResponse(renderPage({
    title,
    description,
    imageUrl,
    requestUrl,
    canonicalUrl: shareRequestUrl(memoryId) || requestUrl,
    redirectUrl,
    memory,
  }));
});

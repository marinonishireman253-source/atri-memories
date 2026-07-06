import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_IDS = 100;
const DEFAULT_EXPIRES_IN = 60 * 60;
const MAX_EXPIRES_IN = 60 * 60 * 6;
const DISPLAY_IMAGE_WIDTH = 320;
const DISPLAY_IMAGE_HEIGHT = 900;
const DISPLAY_IMAGE_QUALITY = 58;

const urlCache = new Map<string, { url: string; expiresAt: number }>();

function isInternalHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === 'localhost'
    || normalized === '127.0.0.1'
    || normalized === '0.0.0.0'
    || normalized === 'kong'
    || normalized === 'supabase-kong'
    || normalized === 'functions'
    || normalized === 'supabase-edge-functions';
}

function normalizedPublicOrigin(parsed: URL) {
  const clone = new URL(parsed.toString());
  if (clone.protocol === 'http:' && ['8000', '8443'].includes(clone.port)) {
    clone.protocol = 'https:';
    clone.port = '';
  }
  if (clone.protocol === 'https:' && ['8000', '8443', '443'].includes(clone.port)) {
    clone.port = '';
  }
  if (clone.protocol === 'http:' && clone.port === '80') {
    clone.port = '';
  }
  return clone.origin.replace(/\/+$/, '');
}

function publicUrlCandidate(value: string) {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    if (isInternalHost(parsed.hostname)) return '';
    return normalizedPublicOrigin(parsed);
  } catch {
    return '';
  }
}

function forwardedBaseUrl(request: Request) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    ?? request.headers.get('host')?.trim()
    ?? '';
  if (!forwardedHost) return '';

  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
    ?? new URL(request.url).protocol.replace(/:$/, '')
    ?? 'https';
  return publicUrlCandidate(`${forwardedProto}://${forwardedHost}`);
}

function publicSupabaseBaseUrl(request: Request) {
  return publicUrlCandidate(Deno.env.get('SUPABASE_PUBLIC_URL') ?? '')
    || publicUrlCandidate(Deno.env.get('API_EXTERNAL_URL') ?? '')
    || publicUrlCandidate(Deno.env.get('PUBLIC_SITE_URL') ?? '')
    || publicUrlCandidate(Deno.env.get('VITE_PUBLIC_SITE_URL') ?? '')
    || forwardedBaseUrl(request)
    || publicUrlCandidate(new URL(request.url).origin)
    || '';
}

function rewritePublicStorageUrl(url: string, publicBaseUrl: string) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.includes('/storage/v1/object/')) return url;
    const publicBase = new URL(publicBaseUrl);
    parsed.protocol = publicBase.protocol;
    parsed.host = publicBase.host;
    if (parsed.port === '8000' || parsed.port === '8443') {
      parsed.protocol = 'https:';
      parsed.port = '';
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function publicObjectUrl(publicBaseUrl: string, storagePath: string) {
  if (!publicBaseUrl || !storagePath) return '';
  return `${publicBaseUrl}/storage/v1/object/public/atri-images/${storagePath}`;
}

function getCachedUrl(key: string): string | null {
  const cached = urlCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 1000 * 60 * 10) {
    return cached.url;
  }
  return null;
}

function setCachedUrl(key: string, url: string, expiresIn: number) {
  urlCache.set(key, {
    url,
    expiresAt: Date.now() + expiresIn * 1000,
  });
}

function proxyDisplayUrl(sourceUrl: string) {
  return `https://wsrv.nl/?url=${encodeURIComponent(sourceUrl)}&w=${DISPLAY_IMAGE_WIDTH}&h=${DISPLAY_IMAGE_HEIGHT}&fit=inside&we&output=webp&q=${DISPLAY_IMAGE_QUALITY}`;
}

function thumbnailPathFor(storagePath: string, memoryId = '') {
  const match = storagePath.match(/^public\/([^/]+)\/([^/.]+)\.[a-z0-9]+$/i);
  if (match) return `public/${match[1]}/thumbs/${match[2]}.webp`;
  return memoryId ? `public/legacy/thumbs/${memoryId}.webp` : '';
}

function thumbnailFolderFor(storagePath: string, memoryId = '') {
  const match = storagePath.match(/^public\/([^/]+)\//i);
  if (match) return `public/${match[1]}/thumbs`;
  return memoryId ? 'public/legacy/thumbs' : '';
}

async function backfillThumbnail(
  supabase: any,
  thumbnailPath: string,
  sourceUrl: string,
) {
  const thumbnailResponse = await fetch(proxyDisplayUrl(sourceUrl));
  if (!thumbnailResponse.ok) return;

  const thumbnailBytes = new Uint8Array(await thumbnailResponse.arrayBuffer());
  await supabase.storage
    .from('atri-images')
    .upload(thumbnailPath, thumbnailBytes, {
      cacheControl: '31536000',
      contentType: 'image/webp',
      upsert: true,
    });
}

function waitUntil(promise: Promise<unknown>) {
  const edgeRuntime = globalThis as typeof globalThis & {
    EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void };
  };
  edgeRuntime.EdgeRuntime?.waitUntil(promise);
}

const folderListCache = new Map<string, { files: Set<string>; expiresAt: number }>();
const FOLDER_CACHE_TTL = 1000 * 60 * 5; // 5 minutes

async function listExistingThumbnails(
  supabase: any,
  sources: { id: string; storagePath: string }[],
) {
  const existing = new Set<string>();
  const folders = [...new Set(
    sources
      .map((source) => thumbnailFolderFor(source.storagePath, source.id))
      .filter(Boolean),
  )];

  for (const folder of folders) {
    const cached = folderListCache.get(folder);
    if (cached && cached.expiresAt > Date.now()) {
      for (const file of cached.files) {
        existing.add(file);
      }
      continue;
    }

    const { data: files } = await supabase.storage
      .from('atri-images')
      .list(folder, {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

    const folderFiles = new Set<string>();
    for (const file of files ?? []) {
      if (typeof file.name === 'string') {
        const fullPath = `${folder}/${file.name}`;
        existing.add(fullPath);
        folderFiles.add(fullPath);
      }
    }

    folderListCache.set(folder, {
      files: folderFiles,
      expiresAt: Date.now() + FOLDER_CACHE_TTL,
    });
  }

  return existing;
}

function response(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isUuid(value: unknown) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function normalizeIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isUuid))].slice(0, MAX_IDS);
}

function clampExpiresIn(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_EXPIRES_IN;
  return Math.min(MAX_EXPIRES_IN, Math.max(60, Math.floor(parsed)));
}

async function getRequestUser(
  supabase: {
    auth: {
      getUser: (jwt: string) => Promise<{
        data: { user: { id: string } | null };
        error: unknown;
      }>;
    };
  },
  request: Request,
) {
  const authHeader = request.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return null;

  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) return null;
  return data.user;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return response({ error: 'Method not allowed.' }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return response({ error: 'Invalid request.' }, 400);
  }

  const ids = normalizeIds(body.ids);
  if (!ids.length) return response({ media: [] }, 200);
  const galleryMode = body.mode === 'gallery';

  const expiresIn = clampExpiresIn(body.expires_in);
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const publicBaseUrl = publicSupabaseBaseUrl(request);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const user = await getRequestUser(supabase, request);

  const { data: adminRow } = user
    ? await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null };
  const isAdmin = Boolean(adminRow);

  const { data: rows, error } = await supabase
    .from('memories')
    .select('id, image_url, storage_path, owner_id, visibility_status')
    .in('id', ids);

  if (error) return response({ error: 'Unable to resolve media.' }, 500);

  const existingThumbnails = await listExistingThumbnails(
    supabase,
    (rows ?? [])
      .filter((row) => row.id && row.storage_path)
      .map((row) => ({ id: row.id, storagePath: row.storage_path })),
  );

  const thumbnailBackfills: Promise<unknown>[] = [];
  const media = (await Promise.all((rows ?? []).map(async (row) => {
    const allowed =
      row.visibility_status === 'public' ||
      (user && row.owner_id === user.id) ||
      isAdmin;

    if (!allowed) return null;

    let signedUrl = '';
    let displayUrl = '';
    const isPublic = row.visibility_status === 'public';
    const publicUrl = isPublic && row.storage_path
      ? publicObjectUrl(publicBaseUrl, row.storage_path)
      : '';

    if (row.storage_path) {
      const thumbnailPath = thumbnailPathFor(row.storage_path, row.id);

      // 1. Resolve Thumbnail URL
      if (thumbnailPath && existingThumbnails.has(thumbnailPath)) {
        const cacheKey = `thumb:${thumbnailPath}`;
        const publicThumbnailUrl = isPublic ? publicObjectUrl(publicBaseUrl, thumbnailPath) : '';
        const cachedThumb = isPublic && !publicThumbnailUrl ? getCachedUrl(cacheKey) : null;
        if (cachedThumb) {
          displayUrl = cachedThumb;
        } else if (publicThumbnailUrl) {
          displayUrl = publicThumbnailUrl;
        } else {
          const { data: thumbnailSignedData } = await supabase.storage
            .from('atri-images')
            .createSignedUrl(thumbnailPath, expiresIn);
          displayUrl = rewritePublicStorageUrl(
            thumbnailSignedData?.signedUrl ?? '',
            publicBaseUrl,
          );
          if (isPublic && displayUrl) {
            setCachedUrl(cacheKey, displayUrl, expiresIn);
          }
        }
      }

      // 2. Resolve Source URL
      if (!galleryMode || !displayUrl) {
        const cacheKey = `source:${row.storage_path}`;
        const cachedSource = isPublic && !publicUrl ? getCachedUrl(cacheKey) : null;
        if (cachedSource) {
          signedUrl = cachedSource;
        } else if (publicUrl) {
          signedUrl = publicUrl;
        } else {
          const { data: signedData } = await supabase.storage
            .from('atri-images')
            .createSignedUrl(row.storage_path, expiresIn);
          signedUrl = rewritePublicStorageUrl(
            signedData?.signedUrl ?? '',
            publicBaseUrl,
          );
          if (isPublic && signedUrl) {
            setCachedUrl(cacheKey, signedUrl, expiresIn);
          }
        }

        if (!displayUrl && thumbnailPath && signedUrl) {
          thumbnailBackfills.push(backfillThumbnail(supabase, thumbnailPath, signedUrl));
        }
      }
    }

    const sourceUrl = signedUrl || publicUrl || (row.storage_path ? '' : row.image_url);
    if (!displayUrl) displayUrl = sourceUrl ? proxyDisplayUrl(sourceUrl) : '';

    return {
      id: row.id,
      signed_url: sourceUrl,
      display_url: displayUrl,
      fallback_display_url: sourceUrl,
      download_url: sourceUrl,
      media_mode: galleryMode ? 'gallery' : 'full',
      expires_at: expiresAt,
    };
  }))).filter(Boolean);

  if (thumbnailBackfills.length > 0) {
    waitUntil(Promise.allSettled(thumbnailBackfills));
  }

  return response({ media }, 200);
});

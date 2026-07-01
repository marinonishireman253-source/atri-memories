import { hasSupabaseConfig, supabase } from './supabaseClient.js';

const MEMORY_IMAGE_HEIGHT = 900;
const MEMORY_IMAGE_QUALITY = 58;
const MEMORY_IMAGE_WIDTHS = [160, 240, 320, 480];
function configuredStorageUrl(memory) {
  if (!memory?.storage_path || memory.storage_path.includes('bypass') || !hasSupabaseConfig || !supabase) {
    return '';
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  if (!supabaseUrl) return '';

  return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/atri-images/${memory.storage_path}`;
}

function isLegacySupabaseUrl(url = '') {
  try {
    const parsed = new URL(String(url));
    return parsed.hostname.endsWith('.supabase.co')
      && parsed.pathname.includes('/storage/v1/object/public/atri-images/');
  } catch {
    return false;
  }
}

function isInternalSupabaseUrl(url = '') {
  try {
    const parsed = new URL(String(url));
    if (parsed.hostname === 'wsrv.nl') {
      return isInternalSupabaseUrl(parsed.searchParams.get('url') || '');
    }
    return ['kong', 'supabase-kong', 'localhost', '127.0.0.1'].includes(parsed.hostname)
      && parsed.pathname.includes('/storage/v1/object/');
  } catch {
    return false;
  }
}

function isUnsafeStorageUrl(url = '') {
  return isLegacySupabaseUrl(url) || isInternalSupabaseUrl(url);
}

function isImageProxyUrl(url = '') {
  try {
    return new URL(String(url)).hostname === 'wsrv.nl';
  } catch {
    return false;
  }
}

function safeMediaUrl(url = '') {
  return url && !isUnsafeStorageUrl(url) ? url : '';
}

function galleryDisplayUrl(memory) {
  return safeMediaUrl(memory?.display_url || '');
}

function memorySourceUrl(memory) {
  const displayUrl = safeMediaUrl(memory?.display_url || '');
  if (displayUrl && !isImageProxyUrl(displayUrl)) {
    return displayUrl;
  }

  const signedOrFallbackUrl = safeMediaUrl(
    memory?.signed_url || memory?.fallback_display_url || memory?.download_url || '',
  );
  if (signedOrFallbackUrl) {
    return signedOrFallbackUrl;
  }

  if (displayUrl) return displayUrl;

  const storageUrl = configuredStorageUrl(memory);
  if (storageUrl) return storageUrl;
  return safeMediaUrl(memory?.image_url || '');
}

function memoryCdnImageUrl(sourceUrl, width) {
  if (!sourceUrl) return '';
  if (isImageProxyUrl(sourceUrl)) return sourceUrl;
  const url = new URL('https://wsrv.nl/');
  url.searchParams.set('url', sourceUrl);
  url.searchParams.set('w', String(width));
  url.searchParams.set('h', String(MEMORY_IMAGE_HEIGHT));
  url.searchParams.set('fit', 'inside');
  url.searchParams.set('we', '');
  url.searchParams.set('output', 'webp');
  url.searchParams.set('q', String(MEMORY_IMAGE_QUALITY));
  return url.toString();
}

export function memoryImageUrl(memory) {
  const signedOrDisplayUrl = memory?.display_url || memory?.signed_url || '';
  const storageUrl = configuredStorageUrl(memory);
  if (signedOrDisplayUrl && !isUnsafeStorageUrl(signedOrDisplayUrl)) {
    return signedOrDisplayUrl;
  }
  if (storageUrl) return storageUrl;
  const url = memory?.image_url || '';
  return isUnsafeStorageUrl(url) ? '' : url;
}

export function memoryGalleryImageUrl(memory, width = 240) {
  const displayUrl = galleryDisplayUrl(memory);
  if (displayUrl) return displayUrl;

  const sourceUrl = memorySourceUrl(memory);
  return memoryCdnImageUrl(sourceUrl, width) || memoryImageUrl(memory);
}

export function memoryGalleryImageSrcSet(memory, widths = MEMORY_IMAGE_WIDTHS) {
  if (galleryDisplayUrl(memory)) return '';

  const sourceUrl = memorySourceUrl(memory);
  if (!sourceUrl) return '';
  return widths
    .map((width) => `${memoryCdnImageUrl(sourceUrl, width)} ${width}w`)
    .join(', ');
}

export function memoryGalleryImageSizes() {
  return '(max-width: 620px) 46vw, (max-width: 900px) 30vw, (orientation: landscape) and (min-width: 820px) and (max-height: 760px) 23vw, 18vw';
}

export function memoryOriginalUrl(memory) {
  const signedOrDownloadUrl = memory?.download_url || memory?.signed_url || '';
  const storageUrl = configuredStorageUrl(memory);
  if (signedOrDownloadUrl && !isUnsafeStorageUrl(signedOrDownloadUrl)) {
    return signedOrDownloadUrl;
  }
  if (storageUrl) return storageUrl;
  const url = memory?.image_url || '';
  return isUnsafeStorageUrl(url) ? '' : url;
}

export function memoryExternalUrl(memory) {
  return memoryImageUrl(memory) || memory?.image_url || '';
}

export async function hydrateMemoryMediaUrls(memories, { expiresIn = 3600, mode = 'full' } = {}) {
  if (!hasSupabaseConfig || !supabase || !memories?.length) {
    return memories ?? [];
  }

  const ids = memories.map((memory) => memory.id).filter(Boolean);
  if (!ids.length) return memories;

  try {
    const { data, error } = await supabase.functions.invoke('media-urls', {
      body: {
        ids,
        expires_in: expiresIn,
        mode,
      },
    });

    if (error) throw error;

    const mediaById = new Map((data.media ?? []).map((item) => [item.id, item]));
    return memories.map((memory) => ({
      ...memory,
      ...(mediaById.get(memory.id) ?? {}),
    }));
  } catch {
    return memories;
  }
}

export async function hydrateMemoryMediaUrl(memory, options) {
  if (!memory) return memory;
  return (await hydrateMemoryMediaUrls([memory], options))[0] ?? memory;
}

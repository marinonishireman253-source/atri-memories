const MEMORY_PATH_PATTERN = /^\/memory\/([^/]+)\/?$/i;
export const SHARE_LINK_MODE_APP = 'app';
export const SHARE_LINK_MODE_PREVIEW = 'preview';

function trimTrailingSlash(value = '') {
  return String(value).trim().replace(/\/+$/, '');
}

function configuredSiteOrigin() {
  return trimTrailingSlash(import.meta.env.VITE_PUBLIC_SITE_URL ?? '');
}

function configuredSupabaseOrigin() {
  return trimTrailingSlash(import.meta.env.VITE_SUPABASE_URL ?? '');
}

export function memoryIdFromLocation(location = window.location) {
  const match = location.pathname.match(MEMORY_PATH_PATTERN);
  return match?.[1] ?? null;
}

export function memorySharePath(id) {
  return `/memory/${id}`;
}

export function publicSiteOrigin(location = typeof window !== 'undefined' ? window.location : null) {
  return configuredSiteOrigin() || location?.origin || '';
}

export function shareLinkMode() {
  return String(import.meta.env.VITE_SHARE_LINK_MODE ?? '').toLowerCase() === SHARE_LINK_MODE_PREVIEW
    ? SHARE_LINK_MODE_PREVIEW
    : SHARE_LINK_MODE_APP;
}

export function sharePreviewStrategy() {
  const mode = shareLinkMode();
  const siteOrigin = configuredSiteOrigin();
  const supabaseOrigin = configuredSupabaseOrigin();
  const canUsePreviewLinks = Boolean(siteOrigin && supabaseOrigin);

  return {
    mode,
    siteOrigin,
    supabaseOrigin,
    hasSiteOrigin: Boolean(siteOrigin),
    hasSupabaseOrigin: Boolean(supabaseOrigin),
    canUsePreviewLinks,
    usingPreviewLinks: mode === SHARE_LINK_MODE_PREVIEW && canUsePreviewLinks,
  };
}

export function memoryShareUrl(id, origin = publicSiteOrigin()) {
  if (!origin) return memorySharePath(id);
  return new URL(memorySharePath(id), origin).toString();
}

export function memorySharePreviewUrl(id) {
  const supabaseOrigin = configuredSupabaseOrigin();
  if (!supabaseOrigin) return '';
  return new URL(`/functions/v1/share-memory?id=${id}`, `${supabaseOrigin}/`).toString();
}

export function preferredMemoryShareUrl(id, { mode = shareLinkMode() } = {}) {
  const previewUrl = memorySharePreviewUrl(id);
  if (mode === SHARE_LINK_MODE_PREVIEW && previewUrl && configuredSiteOrigin()) {
    return previewUrl;
  }
  return memoryShareUrl(id);
}

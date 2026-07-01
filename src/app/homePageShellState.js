function defaultHasBackendConfig() {
  const env = import.meta?.env ?? {};
  const projectUrl = env.VITE_SUPABASE_URL;
  const publicKey = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY;
  return Boolean(projectUrl && publicKey) && env.VITE_DEMO_MODE !== 'true';
}

export function initialGalleryRuntimeState({ hasBackend = defaultHasBackendConfig() } = {}) {
  return {
    connected: hasBackend,
    totalCount: 0,
    favoritesAvailable: false,
    favoritesKnown: false,
    uploading: false,
    deleting: false,
    updating: false,
  };
}

export function shouldBlockPageNavigation({
  currentPath,
  nextPath,
  galleryRuntimeState,
} = {}) {
  if (currentPath !== '/gallery' || nextPath === currentPath) {
    return false;
  }

  return Boolean(galleryRuntimeState?.uploading);
}

export function resolveHeaderFavoritesAvailable({
  currentPath,
  galleryRuntimeState,
  user,
} = {}) {
  if (!user) {
    return false;
  }

  if (currentPath === '/gallery') {
    return Boolean(galleryRuntimeState?.favoritesAvailable);
  }

  if (!galleryRuntimeState?.favoritesKnown) {
    return false;
  }

  return Boolean(galleryRuntimeState.favoritesAvailable);
}

export function applyPendingGalleryScopeIntent({
  pendingGalleryScope,
  user,
  favoritesAvailable,
  showCurrentUserImages,
  showFavoriteImages,
  showCurrentUserScope,
  showFavoritesScope,
} = {}) {
  if (!pendingGalleryScope) {
    return false;
  }

  if (pendingGalleryScope === 'my-images') {
    if (!user) {
      return true;
    }

    showCurrentUserImages?.(user);
    showCurrentUserScope?.(user);
    return true;
  }

  if (pendingGalleryScope === 'my-favorites') {
    if (!user || !favoritesAvailable) {
      return true;
    }

    showFavoriteImages?.();
    showFavoritesScope?.(user);
    return true;
  }

  return false;
}

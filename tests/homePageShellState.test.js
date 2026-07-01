import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyPendingGalleryScopeIntent,
  initialGalleryRuntimeState,
  resolveHeaderFavoritesAvailable,
  shouldBlockPageNavigation,
} from '../src/app/homePageShellState.js';

test('blocks leaving gallery while an upload is still running', () => {
  const state = {
    ...initialGalleryRuntimeState({ hasBackend: true }),
    uploading: true,
  };

  assert.equal(
    shouldBlockPageNavigation({
      currentPath: '/gallery',
      nextPath: '/daily',
      galleryRuntimeState: state,
    }),
    true,
  );
  assert.equal(
    shouldBlockPageNavigation({
      currentPath: '/gallery',
      nextPath: '/gallery',
      galleryRuntimeState: state,
    }),
    false,
  );
});

test('hides favorites entry off-gallery until availability has been confirmed', () => {
  const unresolvedState = initialGalleryRuntimeState({ hasBackend: true });
  const resolvedState = {
    ...unresolvedState,
    favoritesKnown: true,
    favoritesAvailable: true,
  };
  const user = { id: 'user-1', email: 'user@example.com' };

  assert.equal(
    resolveHeaderFavoritesAvailable({
      currentPath: '/',
      galleryRuntimeState: unresolvedState,
      user,
    }),
    false,
  );
  assert.equal(
    resolveHeaderFavoritesAvailable({
      currentPath: '/daily',
      galleryRuntimeState: resolvedState,
      user,
    }),
    true,
  );
});

test('applies shell scope intents and restores the journey status callbacks', () => {
  const calls = [];
  const user = { id: 'user-1', email: 'user@example.com' };

  const handled = applyPendingGalleryScopeIntent({
    pendingGalleryScope: 'my-images',
    user,
    favoritesAvailable: true,
    showCurrentUserImages: (nextUser) => calls.push(['images', nextUser.id]),
    showFavoriteImages: () => calls.push(['favorites']),
    showCurrentUserScope: (nextUser) => calls.push(['status-images', nextUser.id]),
    showFavoritesScope: (nextUser) => calls.push(['status-favorites', nextUser.id]),
  });

  assert.equal(handled, true);
  assert.deepEqual(calls, [
    ['images', 'user-1'],
    ['status-images', 'user-1'],
  ]);
});

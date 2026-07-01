import { useEffect } from 'react';
import {
  DEFAULT_MEMORY_FILTERS,
  favoriteScopedFilters,
  ownerScopedFilters,
} from '../lib/memoryContent.js';

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function useHomePageGalleryScope({
  user,
  filters,
  updateFilters,
  clearOwnerFilter,
  resetFilters,
  showCurrentUserImages,
  showFavoriteImages,
  favoritesAvailable,
  journeyState,
  clearOwnerScopedJourney,
  showCurrentUserScope,
  showFavoritesScope,
  setUserOpen,
  closeMemory,
  navigateToPage,
}) {
  const openGalleryPage = () => {
    navigateToPage?.('/gallery');
  };

  const scrollGalleryPanelSoon = () => {
    window.requestAnimationFrame(() => {
      scrollToSection('gallery-panel');
    });
  };

  useEffect(() => {
    if (!user && (filters.ownerId !== 'all' || filters.favoritesOnly)) {
      updateFilters({
        ownerId: DEFAULT_MEMORY_FILTERS.ownerId,
        ownerLabel: DEFAULT_MEMORY_FILTERS.ownerLabel,
        favoritesOnly: DEFAULT_MEMORY_FILTERS.favoritesOnly,
      });
    }
  }, [filters.favoritesOnly, filters.ownerId, updateFilters, user]);

  useEffect(() => {
    if (!favoritesAvailable && filters.favoritesOnly) {
      updateFilters({
        ownerId: DEFAULT_MEMORY_FILTERS.ownerId,
        ownerLabel: DEFAULT_MEMORY_FILTERS.ownerLabel,
        favoritesOnly: DEFAULT_MEMORY_FILTERS.favoritesOnly,
      });
      clearOwnerScopedJourney();
    }
  }, [clearOwnerScopedJourney, favoritesAvailable, filters.favoritesOnly, updateFilters]);

  useEffect(() => {
    if (!user) {
      clearOwnerScopedJourney();
      return;
    }
    if (
      (journeyState?.type === 'my-images' || journeyState?.type === 'upload-complete') &&
      filters.ownerId !== user.id
    ) {
      clearOwnerScopedJourney();
    }
    if (journeyState?.type === 'my-favorites' && !filters.favoritesOnly) {
      clearOwnerScopedJourney();
    }
  }, [clearOwnerScopedJourney, filters.favoritesOnly, filters.ownerId, journeyState?.type, user]);

  const showMyImages = () => {
    showCurrentUserImages(user);
    showCurrentUserScope(user);
    setUserOpen(false);
    openGalleryPage();
  };

  const showMyImagesByTag = (tag) => {
    if (!user || !tag) return;
    updateFilters({
      ...ownerScopedFilters(user),
      tag,
    });
    showCurrentUserScope(user);
    setUserOpen(false);
    openGalleryPage();
    scrollGalleryPanelSoon();
  };

  const showMyFavorites = () => {
    if (!user || !favoritesAvailable) return;
    showFavoriteImages();
    showFavoritesScope(user);
    setUserOpen(false);
    openGalleryPage();
  };

  const clearOwnerFilterWithJourney = () => {
    clearOwnerFilter();
    clearOwnerScopedJourney();
  };

  const resetGalleryFilters = () => {
    resetFilters();
    clearOwnerScopedJourney();
  };

  const selectGalleryTag = (tag) => {
    updateFilters({
      ...DEFAULT_MEMORY_FILTERS,
      tag,
    });
    clearOwnerScopedJourney();
    setUserOpen(false);
  };

  const selectViewerTag = (tag) => {
    if (!tag) return;
    selectGalleryTag(tag);
    closeMemory({ syncUrl: false });
    openGalleryPage();
    scrollGalleryPanelSoon();
  };

  const showAllPublicImages = () => {
    updateFilters({
      ownerId: DEFAULT_MEMORY_FILTERS.ownerId,
      ownerLabel: DEFAULT_MEMORY_FILTERS.ownerLabel,
      favoritesOnly: DEFAULT_MEMORY_FILTERS.favoritesOnly,
    });
    clearOwnerScopedJourney();
    setUserOpen(false);
    openGalleryPage();
  };

  const resetMyImagesFilters = () => {
    showCurrentUserImages(user);
    clearOwnerScopedJourney();
    setUserOpen(false);
    openGalleryPage();
  };

  const resetFavoriteFilters = () => {
    updateFilters(favoriteScopedFilters());
    showFavoritesScope(user);
    setUserOpen(false);
    openGalleryPage();
  };

  const resetToPublicGallery = () => {
    updateFilters({ ...DEFAULT_MEMORY_FILTERS });
    clearOwnerScopedJourney();
  };

  return {
    scrollToSection,
    showMyImages,
    showMyImagesByTag,
    showMyFavorites,
    clearOwnerFilterWithJourney,
    resetGalleryFilters,
    selectViewerTag,
    showAllPublicImages,
    resetMyImagesFilters,
    resetFavoriteFilters,
    resetToPublicGallery,
  };
}

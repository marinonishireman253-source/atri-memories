import { useCallback, useEffect, useMemo } from 'react';
import { useGalleryManagement } from '../features/gallery/useGalleryManagement.js';
import { useMemoryFavorites } from '../hooks/useMemoryFavorites.js';
import { useMemories } from '../hooks/useMemories.js';
import { useUserSummary } from '../hooks/useUserSummary.js';
import { setDefaultPageMeta, setMemoryPageMeta } from '../lib/pageMeta.js';
import { memoryIdFromLocation } from '../lib/routes.js';
import {
  memoryDeletedJourneyNotice,
  memoryUpdatedJourneyNotice,
} from '../lib/userJourney.js';
import { favoriteRemovedNotice, favoriteSavedNotice } from '../lib/userFeedback.js';
import { userOnboardingModel } from '../lib/userOnboarding.js';
import { userGalleryScopeModel } from '../lib/userSpace.js';
import { buildHomeOverlayProps } from './homePageOverlayPropsModel.js';
import { buildHomeStatusProps } from './homePagePropsModel.js';
import { applyPendingGalleryScopeIntent } from './homePageShellState.js';
import { useHomePageGalleryScope } from './useHomePageGalleryScope.js';
import { useHomePageStatus } from './useHomePageStatus.js';

export function useGalleryPageModel({
  navigateToPage,
  user,
  isAdmin,
  settings,
  uploadMaxBytes,
  loadingSettings,
  savingSettings,
  settingsError,
  refreshSettings,
  saveSettings,
  filtersState,
  pendingGalleryOverlay,
  clearPendingGalleryOverlay,
  pendingGalleryScope,
  clearPendingGalleryScope,
  onRuntimeStateChange,
  uiState,
} = {}) {
  const {
    filters,
    updateFilters,
    clearOwnerFilter,
    resetFilters,
    showCurrentUserImages,
    showFavoriteImages,
  } = filtersState;
  const {
    connected: summaryConnected,
    summary,
    loadingSummary,
    savingProfile,
    summaryError,
    refreshSummary,
    saveProfile,
  } = useUserSummary(user);
  const {
    favoriteIds,
    favoritesCount,
    favoritesAvailable,
    loadingFavorites,
    togglingFavoriteId,
    favoritesError,
    favoritesNotice,
    refreshFavorites,
    toggleFavorite,
  } = useMemoryFavorites(user);
  const {
    connected,
    memories,
    loading,
    loadingMore,
    loadingMemory,
    hasMore,
    totalCount,
    uploading,
    deleting,
    updating,
    error,
    refresh,
    loadMore,
    getMemoryById,
    addMemories,
    deleteMemory,
    deleteMemories,
    updateMemory,
    canManageMemory,
  } = useMemories({ user, isAdmin, filters, uploadMaxBytes });
  const {
    uploadOpen,
    userOpen,
    adminOpen,
    selectedMemory,
    viewerMemories,
    selectedMemoryIndex,
    setUploadOpen,
    setAuthOpen,
    setUserOpen,
    setAdminOpen,
    setSelectedMemory,
    setViewerMemories,
    openMemory,
    closeMemory,
    navigateMemory,
  } = uiState;

  const uploadDisabled = !settings.uploadsEnabled && !isAdmin;
  const galleryScope = userGalleryScopeModel({
    user,
    filters,
    totalCount,
    loading,
  });
  const onboarding = userOnboardingModel({
    user,
    loadingSummary,
    summary,
    uploadDisabled,
    galleryScope,
  });
  const {
    journeyState,
    statusItems,
    dismissJourneyStatus,
    dismissOnboardingStatus,
    clearOwnerScopedJourney,
    showUploadDisabled,
    showCurrentUserScope,
    showFavoritesScope,
    showUploadCompleted,
    showBatchDeleteCompleted,
  } = useHomePageStatus({ error, loadingMemory, onboarding });
  const {
    showMyImages,
    showMyImagesByTag,
    showMyFavorites,
    clearOwnerFilterWithJourney,
    resetGalleryFilters,
    selectViewerTag,
    showAllPublicImages,
    resetMyImagesFilters,
    resetFavoriteFilters,
  } = useHomePageGalleryScope({
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
  });
  const {
    selectedIds: gallerySelectedIds,
    confirmingDelete: confirmingDeleteSelected,
    activityById: galleryActivityById,
    notice: galleryManageNotice,
    setNotice: setGalleryManageNotice,
    markActivity: markGalleryActivity,
    toggleSelected: toggleGalleryMemorySelected,
    selectVisible: selectVisibleGalleryMemories,
    clearSelection: clearSelectedGalleryMemories,
    deleteSelected: deleteSelectedGalleryMemories,
  } = useGalleryManagement({
    memories,
    user,
    galleryScope,
    deleteMemories,
    refreshSummary,
    refreshFavorites,
    showBatchDeleteCompleted,
  });

  useEffect(() => {
    onRuntimeStateChange?.({
      connected,
      totalCount,
      favoritesAvailable,
      favoritesKnown: true,
      uploading,
      deleting,
      updating,
    });
  }, [
    connected,
    deleting,
    favoritesAvailable,
    onRuntimeStateChange,
    totalCount,
    updating,
    uploading,
  ]);

  useEffect(() => {
    if (selectedMemory) {
      setMemoryPageMeta(selectedMemory);
      return;
    }
    setDefaultPageMeta();
  }, [selectedMemory]);

  useEffect(() => {
    let cancelled = false;

    const openFromUrl = async () => {
      const memoryId = memoryIdFromLocation();
      if (!memoryId) {
        if (!cancelled) {
          setSelectedMemory(null);
          setViewerMemories([]);
        }
        return;
      }

      const memory = await getMemoryById(memoryId);
      if (!cancelled) {
        setSelectedMemory(memory);
        setViewerMemories([]);
      }
    };

    const handlePopState = () => {
      openFromUrl();
    };

    openFromUrl();
    window.addEventListener('popstate', handlePopState);
    return () => {
      cancelled = true;
      window.removeEventListener('popstate', handlePopState);
    };
  }, [getMemoryById, setSelectedMemory, setViewerMemories]);

  useEffect(() => {
    if (!pendingGalleryOverlay) return;

    if (pendingGalleryOverlay === 'upload') {
      setUserOpen(false);
      setAdminOpen(false);
      if (uploadDisabled) {
        showUploadDisabled();
      } else {
        setUploadOpen(true);
      }
    }

    if (pendingGalleryOverlay === 'user') {
      setUploadOpen(false);
      setAdminOpen(false);
      refreshSummary();
      refreshFavorites();
      setUserOpen(true);
    }

    if (pendingGalleryOverlay === 'admin') {
      setUploadOpen(false);
      setUserOpen(false);
      if (isAdmin) {
        setAdminOpen(true);
      }
    }

    clearPendingGalleryOverlay?.();
  }, [
    clearPendingGalleryOverlay,
    isAdmin,
    pendingGalleryOverlay,
    refreshFavorites,
    refreshSummary,
    setAdminOpen,
    setUploadOpen,
    setUserOpen,
    showUploadDisabled,
    uploadDisabled,
  ]);

  useEffect(() => {
    if (!pendingGalleryScope) return;

    const handled = applyPendingGalleryScopeIntent({
      pendingGalleryScope,
      user,
      favoritesAvailable,
      showCurrentUserImages,
      showFavoriteImages,
      showCurrentUserScope,
      showFavoritesScope,
    });

    if (handled) {
      clearPendingGalleryScope?.();
    }
  }, [
    clearPendingGalleryScope,
    favoritesAvailable,
    pendingGalleryScope,
    showCurrentUserImages,
    showCurrentUserScope,
    showFavoriteImages,
    showFavoritesScope,
    user,
  ]);

  const uploadMemories = async (payload) => {
    const results = await addMemories(payload);
    await refreshSummary();
    const failed = results.filter((result) => !result.success).length;
    const succeeded = results.length - failed;

    if (failed === 0 && succeeded > 0) {
      showCurrentUserImages(user);
      showUploadCompleted(user, succeeded);
    }

    return results;
  };

  const openUpload = () => {
    if (uploadDisabled) {
      showUploadDisabled();
      return;
    }
    setUploadOpen(true);
  };

  const saveMemoryInfo = async (payload) => {
    const updatedMemory = await updateMemory(payload);
    setSelectedMemory((current) =>
      current?.id === updatedMemory.id ? { ...current, ...updatedMemory } : current,
    );
    markGalleryActivity(updatedMemory.id, { tone: 'success', label: '刚更新' });
    setGalleryManageNotice(memoryUpdatedJourneyNotice(updatedMemory.title));
  };

  const toggleMemoryFavorite = async (memory) => {
    if (!favoritesAvailable) {
      throw new Error('收藏功能尚未在当前站点启用。');
    }
    const nextFavorite = await toggleFavorite(memory);
    await refreshSummary();

    setGalleryManageNotice(
      nextFavorite ? favoriteSavedNotice(memory.title) : favoriteRemovedNotice(memory.title),
    );

    if (selectedMemory?.id === memory.id) {
      setSelectedMemory((current) =>
        current ? { ...current, is_favorited: nextFavorite } : current,
      );
    }

    if (filters.favoritesOnly) {
      await refresh();
    }
  };

  const openViewerMemory = useCallback(async (memory, { collection = null } = {}) => {
    const nextMemory = (memory?.media_mode === 'gallery' || (isAdmin && !memory?.report_summary))
      ? await getMemoryById(memory.id) ?? memory
      : memory;
    const nextCollection = Array.isArray(collection)
      ? collection.map((item) => (item.id === nextMemory.id ? { ...item, ...nextMemory } : item))
      : collection;
    openMemory(nextMemory, { collection: nextCollection });
  }, [getMemoryById, isAdmin, openMemory]);

  const handleOpenMemoryFromGallery = useCallback((memory) => {
    openViewerMemory(memory, { collection: memories });
  }, [openViewerMemory, memories]);

  const deleteMemoryFromViewer = async ({ memory }) => {
    const currentIndex = selectedMemoryIndex;
    const currentCollection = viewerMemories;
    const hasCollectionContext =
      currentIndex >= 0 &&
      Array.isArray(currentCollection) &&
      currentCollection.some((item) => item.id === memory.id);

    const nextCollection = hasCollectionContext
      ? currentCollection.filter((item) => item.id !== memory.id)
      : [];
    const nextMemory = hasCollectionContext
      ? nextCollection[currentIndex] ?? nextCollection[currentIndex - 1] ?? null
      : null;

    await deleteMemory({ memory });
    await Promise.all([refreshSummary(), refreshFavorites()]);
    setGalleryManageNotice(memoryDeletedJourneyNotice(memory.title));

    if (nextMemory) {
      openMemory(nextMemory, { collection: nextCollection });
      return;
    }

    closeMemory();
  };

  const statusProps = buildHomeStatusProps({
    statusItems,
    actions: {
      dismissOnboardingStatus,
      dismissJourneyStatus,
      clearOwnerFilterWithJourney,
      showAllPublicImages,
      openUpload,
      resetMyImagesFilters,
    },
  });

  const overlaysProps = buildHomeOverlayProps({
    uploadModal: {
      open: uploadOpen,
      connected,
      isAdmin,
      uploading,
      settings,
      onClose: () => setUploadOpen(false),
      onUploadMemories: uploadMemories,
    },
    userPanel: {
      open: userOpen,
      user,
      connected: summaryConnected,
      summary,
      loadingSummary,
      savingProfile,
      summaryError,
      favoritesCount: summary.favoritesCount ?? favoritesCount,
      favoritesAvailable,
      loadingFavorites,
      favoritesError,
      favoritesNotice,
      uploadDisabled,
      galleryScope,
      onboarding,
      onClose: () => setUserOpen(false),
      onRefreshSummary: () => {
        refreshSummary();
        refreshFavorites();
      },
      onSaveProfile: saveProfile,
      onShowCurrentUserImages: showMyImages,
      onShowFavorites: favoritesAvailable ? showMyFavorites : undefined,
      onShowAllImages: showAllPublicImages,
      onResetMyImages: galleryScope.isFavoritesScope ? resetFavoriteFilters : resetMyImagesFilters,
      onSelectUserTag: showMyImagesByTag,
      onOpenUploadFromUser: () => {
        setUserOpen(false);
        openUpload();
      },
    },
    adminPanel: {
      open: adminOpen,
      isAdmin,
      deleting,
      onClose: () => setAdminOpen(false),
      onOpenMemory: openViewerMemory,
      onFilterOwner: (owner) => {
        updateFilters({
          ownerId: owner.id,
          ownerLabel: owner.email,
        });
        clearOwnerScopedJourney();
      },
      deleteMemories,
      settings,
      loadingSettings,
      savingSettings,
      settingsError,
      refreshSettings,
      saveSettings,
    },
    viewer: {
      memory: selectedMemory,
      user,
      deleting,
      updating,
      canManageMemory,
      isAdmin,
      favoriteIds,
      favoritesAvailable,
      togglingFavoriteId,
      tagPresets: settings.tagPresets,
      selectedMemoryIndex,
      viewerMemories,
      navigateMemory,
      onClose: closeMemory,
      deleteMemory: deleteMemoryFromViewer,
      onSaveMemoryInfo: saveMemoryInfo,
      onToggleFavorite: toggleMemoryFavorite,
      onSelectTag: selectViewerTag,
      onNeedAuth: () => setAuthOpen(true),
    },
  });

  const galleryProps = useMemo(() => ({
    connected,
    memories,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    user,
    filters,
    galleryScope,
    onRefresh: refresh,
    onLoadMore: loadMore,
    onFiltersChange: updateFilters,
    onShowMyImages: showMyImages,
    onShowFavorites: favoritesAvailable ? showMyFavorites : null,
    onShowAllImages: showAllPublicImages,
    onResetFilters: resetGalleryFilters,
    favoriteIds,
    galleryActivityById,
    galleryManageNotice,
    gallerySelectedIds,
    onToggleMemorySelected: toggleGalleryMemorySelected,
    onSelectVisibleMemories: selectVisibleGalleryMemories,
    onClearSelectedMemories: clearSelectedGalleryMemories,
    onDeleteSelectedMemories: deleteSelectedGalleryMemories,
    confirmingDeleteSelected,
    deleting,
    onClearOwnerFilter: clearOwnerFilterWithJourney,
    onOpenMemory: handleOpenMemoryFromGallery,
    tagPresets: settings.tagPresets,
  }), [
    connected,
    memories,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    user,
    filters,
    galleryScope,
    refresh,
    loadMore,
    updateFilters,
    showMyImages,
    favoritesAvailable,
    showMyFavorites,
    showAllPublicImages,
    resetGalleryFilters,
    favoriteIds,
    galleryActivityById,
    galleryManageNotice,
    gallerySelectedIds,
    toggleGalleryMemorySelected,
    selectVisibleGalleryMemories,
    clearSelectedGalleryMemories,
    deleteSelectedGalleryMemories,
    confirmingDeleteSelected,
    deleting,
    clearOwnerFilterWithJourney,
    handleOpenMemoryFromGallery,
    settings.tagPresets,
  ]);

  return {
    galleryProps,
    statusProps,
    overlaysProps,
  };
}

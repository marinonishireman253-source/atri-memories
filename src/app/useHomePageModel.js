import { useEffect, useState } from 'react';
import { backgroundPresets } from '../data/backgrounds.js';
import { useSiteSettings } from '../hooks/useSiteSettings.js';
import { useAuth } from '../hooks/useAuth.js';
import { setDefaultPageMeta } from '../lib/pageMeta.js';
import { hasSupabaseConfig } from '../lib/supabaseClient.js';
import { buildHomeOverlayProps } from './homePageOverlayPropsModel.js';
import {
  initialGalleryRuntimeState,
  resolveHeaderFavoritesAvailable,
  shouldBlockPageNavigation,
} from './homePageShellState.js';
import { useAppFiltersState, useAppUiState } from './useAppUiState.js';

export function useHomePageModel({ navigateToPage, currentPath, setNavigationBlocker } = {}) {
  const {
    user,
    isAdmin,
    signIn,
    signUp,
    resendConfirmation,
    sendPasswordReset,
    signOut,
  } = useAuth();
  const {
    settings,
    uploadMaxBytes,
    loadingSettings,
    savingSettings,
    settingsError,
    refreshSettings,
    saveSettings,
  } = useSiteSettings(user);
  const filtersState = useAppFiltersState();
  const [pendingGalleryOverlay, setPendingGalleryOverlay] = useState(null);
  const [pendingGalleryScope, setPendingGalleryScope] = useState(null);
  const [galleryRuntimeState, setGalleryRuntimeState] = useState(initialGalleryRuntimeState);
  const uiState = useAppUiState({
    uploading: galleryRuntimeState.uploading,
    deleting: galleryRuntimeState.deleting,
    updating: galleryRuntimeState.updating,
    navigateToPage,
    currentPath,
  });

  const {
    background,
    backgroundStyle,
    themeOpen,
    authOpen,
    selectedMemory,
    viewerMemories,
    setUploadOpen,
    setThemeOpen,
    setAuthOpen,
    setUserOpen,
    setAdminOpen,
    setViewerMemories,
    changeBackground,
    closeMemory,
  } = uiState;

  // Blog Editor shared states
  const [blogEditorOpen, setBlogEditorOpen] = useState(false);
  const [editingBlogPost, setEditingBlogPost] = useState(null);
  const [blogEditorSaving, setBlogEditorSaving] = useState(false);
  const [blogEditorError, setBlogEditorError] = useState('');
  const [blogEditorSaveCallback, setBlogEditorSaveCallback] = useState(null);

  const uploadDisabled = !settings.uploadsEnabled && !isAdmin;
  const headerConnected = currentPath === '/gallery'
    ? galleryRuntimeState.connected
    : hasSupabaseConfig;
  const headerTotalCount = currentPath === '/gallery' ? galleryRuntimeState.totalCount : 0;
  const headerFavoritesAvailable = resolveHeaderFavoritesAvailable({
    currentPath,
    galleryRuntimeState,
    user,
  });

  const clearGalleryPanels = () => {
    setUploadOpen(false);
    setUserOpen(false);
    setAdminOpen(false);
    setBlogEditorOpen(false);
    if (selectedMemory) {
      closeMemory({ syncUrl: false });
    } else if (viewerMemories.length) {
      setViewerMemories([]);
    }
  };

  useEffect(() => {
    if (!selectedMemory) {
      setDefaultPageMeta();
    }
  }, [selectedMemory]);

  useEffect(() => {
    if (!user) setUserOpen(false);
    if (!isAdmin) {
      setAdminOpen(false);
      setBlogEditorOpen(false);
    }
    if (!user) {
      setPendingGalleryOverlay(null);
      setPendingGalleryScope(null);
      setGalleryRuntimeState(initialGalleryRuntimeState());
    }
  }, [isAdmin, setAdminOpen, setUserOpen, user]);

  useEffect(() => {
    setNavigationBlocker?.((nextPath) => !shouldBlockPageNavigation({
      currentPath,
      nextPath,
      galleryRuntimeState,
    }));

    return () => {
      setNavigationBlocker?.(null);
    };
  }, [currentPath, galleryRuntimeState, setNavigationBlocker]);

  useEffect(() => {
    if (currentPath === '/gallery') return;

    setPendingGalleryOverlay(null);
    setPendingGalleryScope(null);
    setUploadOpen(false);
    setUserOpen(false);
    setAdminOpen(false);

    if (selectedMemory) {
      closeMemory({ syncUrl: false });
    } else if (viewerMemories.length) {
      setViewerMemories([]);
    }
  }, [currentPath]);

  const navigateToGallery = () => {
    navigateToPage?.('/gallery');
  };

  const requestGalleryOverlay = (overlay) => {
    clearGalleryPanels();
    setPendingGalleryScope(null);
    setPendingGalleryOverlay(overlay);
    navigateToGallery();
  };

  const requestGalleryScope = (scope) => {
    clearGalleryPanels();
    setPendingGalleryOverlay(null);
    setPendingGalleryScope(scope);
    navigateToGallery();
  };

  const openUploadFromShell = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    requestGalleryOverlay('upload');
  };

  const openUserSpaceFromShell = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    requestGalleryOverlay('user');
  };

  const openAdminFromShell = () => {
    if (!user) {
      setAuthOpen(true);
      navigateToPage?.('/admin');
      return;
    }
    if (!isAdmin) return;
    clearGalleryPanels();
    navigateToPage?.('/admin');
  };

  const showMyImagesFromShell = () => {
    if (!user) return;
    filtersState.showCurrentUserImages(user);
    requestGalleryScope('my-images');
  };

  const showFavoritesFromShell = () => {
    if (!user) return;
    filtersState.showFavoriteImages();
    requestGalleryScope('my-favorites');
  };

  const signUpWithPolicy = async ({ email, password }) => {
    if (!settings.registrationsEnabled) {
      throw new Error('站点当前未开放公开注册，请联系管理员创建账号。');
    }
    await signUp({ email, password });
  };

  const signOutWithReset = async () => {
    setPendingGalleryOverlay(null);
    setPendingGalleryScope(null);
    setGalleryRuntimeState(initialGalleryRuntimeState());
    filtersState.resetFilters();
    clearGalleryPanels();
    if (currentPath === '/gallery' || selectedMemory) {
      navigateToPage?.('/gallery');
    }
    await signOut();
  };

  return {
    background,
    backgroundStyle,
    footerYear: new Date().getFullYear(),
    heroProps: {
      user,
      uploadDisabled,
      onOpenAuth: () => setAuthOpen(true),
      onOpenUpload: openUploadFromShell,
      onOpenGallery: navigateToGallery,
    },
    headerProps: {
      connected: headerConnected,
      totalCount: headerTotalCount,
      user,
      isAdmin,
      uploadDisabled,
      favoritesAvailable: headerFavoritesAvailable,
      onOpenTheme: () => setThemeOpen(true),
      onOpenUpload: openUploadFromShell,
      onOpenUser: openUserSpaceFromShell,
      onShowMyImages: showMyImagesFromShell,
      onShowFavorites: headerFavoritesAvailable ? showFavoritesFromShell : undefined,
      onOpenAdmin: openAdminFromShell,
      onOpenAuth: () => setAuthOpen(true),
      onSignOut: signOutWithReset,
      onOpenBlogEditor: () => {
        setEditingBlogPost(null);
        setBlogEditorOpen(true);
      },
    },
    overlayProps: buildHomeOverlayProps({
      authModal: {
        open: authOpen,
        settings,
        onClose: () => setAuthOpen(false),
        signIn,
        signUpWithPolicy,
        resendConfirmation,
        sendPasswordReset,
      },
      themeModal: {
        open: themeOpen,
        background,
        presets: backgroundPresets,
        onChangeBackground: changeBackground,
        onClose: () => setThemeOpen(false),
      },
      blogEditor: {
        open: blogEditorOpen,
        post: editingBlogPost,
        saving: blogEditorSaving,
        error: blogEditorError,
        onClose: () => {
          setBlogEditorOpen(false);
          setEditingBlogPost(null);
          setBlogEditorError('');
        },
        onSave: (data) => {
          if (blogEditorSaveCallback) {
            blogEditorSaveCallback(data);
          }
        },
      },
    }),
    galleryRouteProps: {
      navigateToPage,
      currentPath,
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
      pendingGalleryScope,
      clearPendingGalleryOverlay: () => setPendingGalleryOverlay(null),
      clearPendingGalleryScope: () => setPendingGalleryScope(null),
      onRuntimeStateChange: setGalleryRuntimeState,
      uiState,
      blogEditorOpen,
      setBlogEditorOpen,
      editingBlogPost,
      setEditingBlogPost,
      setBlogEditorSaving,
      setBlogEditorError,
      setBlogEditorSaveCallback,
    },
  };
}

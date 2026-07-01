import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultBackground } from '../data/backgrounds.js';
import {
  DEFAULT_MEMORY_FILTERS,
  favoriteScopedFilters,
  ownerScopedFilters,
} from '../lib/memoryContent.js';
import { memoryIdFromLocation, memorySharePath } from '../lib/routes.js';

const THEME_STORAGE_KEY = 'atri-memory-background';
export const initialFilters = DEFAULT_MEMORY_FILTERS;

function savedBackground() {
  return window.localStorage.getItem(THEME_STORAGE_KEY) || defaultBackground;
}

export function useAppFiltersState() {
  const [filters, setFilters] = useState(initialFilters);

  const updateFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const clearOwnerFilter = () => {
    setFilters((current) => ({ ...current, ownerId: 'all', ownerLabel: '' }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const showCurrentUserImages = (user) => {
    if (!user) return;
    setFilters(ownerScopedFilters(user));
  };

  const showFavoriteImages = () => {
    setFilters(favoriteScopedFilters());
  };

  return {
    filters,
    updateFilters,
    clearOwnerFilter,
    resetFilters,
    showCurrentUserImages,
    showFavoriteImages,
  };
}

export function useAppUiState({
  uploading = false,
  deleting = false,
  updating = false,
  navigateToPage,
  currentPath,
}) {
  const [background, setBackground] = useState(savedBackground);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [viewerMemories, setViewerMemories] = useState([]);
  const lastNonMemoryPathRef = useRef(currentPath || '/');

  const modalOpen = uploadOpen || themeOpen || authOpen || userOpen || adminOpen || Boolean(selectedMemory);
  const backgroundStyle = useMemo(
    () => ({ '--background-image': `url("${background}")` }),
    [background],
  );

  const changeBackground = (url) => {
    setBackground(url);
    window.localStorage.setItem(THEME_STORAGE_KEY, url);
  };

  const openMemory = (memory, { syncUrl = true, collection = null } = {}) => {
    if (!memoryIdFromLocation() && currentPath) {
      lastNonMemoryPathRef.current = currentPath;
    }
    setSelectedMemory(memory);
    if (Array.isArray(collection)) {
      setViewerMemories(collection);
    }
    if (syncUrl && window.location.pathname !== memorySharePath(memory.id)) {
      navigateToPage?.(memorySharePath(memory.id));
    }
  };

  const closeMemory = ({ syncUrl = true } = {}) => {
    setSelectedMemory(null);
    setViewerMemories([]);
    if (syncUrl && memoryIdFromLocation()) {
      navigateToPage?.(lastNonMemoryPathRef.current || '/');
    }
  };

  useEffect(() => {
    if (!memoryIdFromLocation() && currentPath) {
      lastNonMemoryPathRef.current = currentPath;
    }
  }, [currentPath]);

  const selectedMemoryIndex = useMemo(() => {
    if (!selectedMemory || !viewerMemories.length) return -1;
    return viewerMemories.findIndex((memory) => memory.id === selectedMemory.id);
  }, [selectedMemory, viewerMemories]);

  const navigateMemory = (direction) => {
    if (selectedMemoryIndex < 0) return;
    const nextIndex = selectedMemoryIndex + direction;
    const nextMemory = viewerMemories[nextIndex];
    if (!nextMemory) return;
    openMemory(nextMemory, { collection: viewerMemories });
  };

  useEffect(() => {
    if (!modalOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !uploading && !deleting && !updating) {
        setThemeOpen(false);
        setUploadOpen(false);
        setAuthOpen(false);
        setUserOpen(false);
        setAdminOpen(false);
        closeMemory();
      }
    };

    document.body.classList.add('modal-active');
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.classList.remove('modal-active');
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [closeMemory, deleting, modalOpen, updating, uploading]);

  return {
    background,
    backgroundStyle,
    modalOpen,
    uploadOpen,
    themeOpen,
    authOpen,
    userOpen,
    adminOpen,
    selectedMemory,
    viewerMemories,
    selectedMemoryIndex,
    setUploadOpen,
    setThemeOpen,
    setAuthOpen,
    setUserOpen,
    setAdminOpen,
    setSelectedMemory,
    setViewerMemories,
    changeBackground,
    openMemory,
    closeMemory,
    navigateMemory,
  };
}

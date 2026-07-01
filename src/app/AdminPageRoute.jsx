import { Suspense, useCallback, useEffect } from 'react';
import { AppOverlays } from './AppOverlays.jsx';
import { AdminPanel } from './lazyPanels.js';
import { useMemoryFavorites } from '../hooks/useMemoryFavorites.js';
import { useMemories } from '../hooks/useMemories.js';
import { setDefaultPageMeta } from '../lib/pageMeta.js';

function AdminAccessPanel({ title, body, actionLabel, onAction }) {
  return (
    <section className="admin-page-shell">
      <div className="admin-access-panel glass-panel">
        <p className="eyebrow">ADMIN CONSOLE</p>
        <h1>{title}</h1>
        <p>{body}</p>
        {actionLabel && (
          <button className="primary-button" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
    </section>
  );
}

export function AdminPageRoute({
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
  uiState,
}) {
  const {
    selectedMemory,
    viewerMemories,
    selectedMemoryIndex,
    setSelectedMemory,
    setAuthOpen,
    openMemory,
    closeMemory,
    navigateMemory,
  } = uiState;
  const {
    deleting,
    updating,
    getMemoryById,
    deleteMemory,
    deleteMemories,
    updateMemory,
    canManageMemory,
  } = useMemories({
    user,
    isAdmin,
    filters: filtersState.filters,
    uploadMaxBytes,
  });
  const {
    favoriteIds,
    favoritesAvailable,
    togglingFavoriteId,
    toggleFavorite,
  } = useMemoryFavorites(user);

  useEffect(() => {
    setDefaultPageMeta();
  }, []);

  const openAdminMemory = useCallback(async (memory, { collection = null } = {}) => {
    const nextMemory = memory?.media_mode === 'gallery' || (isAdmin && !memory?.report_summary)
      ? await getMemoryById(memory.id) ?? memory
      : memory;
    const nextCollection = Array.isArray(collection)
      ? collection.map((item) => (item.id === nextMemory.id ? { ...item, ...nextMemory } : item))
      : collection;

    openMemory(nextMemory, { syncUrl: false, collection: nextCollection });
  }, [getMemoryById, isAdmin, openMemory]);

  const deleteMemoryFromViewer = async ({ memory }) => {
    await deleteMemory({ memory });
    closeMemory({ syncUrl: false });
  };

  const saveMemoryInfo = async (payload) => {
    const updatedMemory = await updateMemory(payload);
    setSelectedMemory((current) =>
      current?.id === updatedMemory.id ? { ...current, ...updatedMemory } : current,
    );
  };

  const toggleMemoryFavorite = async (memory) => {
    if (!favoritesAvailable) {
      throw new Error('收藏功能尚未在当前站点启用。');
    }
    const nextFavorite = await toggleFavorite(memory);

    if (selectedMemory?.id === memory.id) {
      setSelectedMemory((current) =>
        current ? { ...current, is_favorited: nextFavorite } : current,
      );
    }
  };

  if (!user) {
    return (
      <AdminAccessPanel
        title="需要管理员登录"
        body="后台管理是独立页面，请先登录管理员账号后再进入图片、用户、举报和站点设置。"
        actionLabel="登录管理员账号"
        onAction={() => setAuthOpen(true)}
      />
    );
  }

  if (!isAdmin) {
    return (
      <AdminAccessPanel
        title="当前账号没有管理权限"
        body="这个页面只对管理员开放。请切换到已加入管理员列表的账号，或让现有管理员在后台用户管理中授权。"
        actionLabel="返回首页"
        onAction={() => navigateToPage?.('/')}
      />
    );
  }

  return (
    <section className="admin-page-shell">
      <Suspense fallback={<div className="admin-page-loading glass-panel">正在打开管理后台...</div>}>
        <AdminPanel
          variant="page"
          deleting={deleting}
          onOpenMemory={openAdminMemory}
          onFilterOwner={() => {}}
          onDeleteMany={deleteMemories}
          settings={settings}
          loadingSettings={loadingSettings}
          savingSettings={savingSettings}
          settingsError={settingsError}
          onRefreshSettings={refreshSettings}
          onSaveSettings={saveSettings}
        />
      </Suspense>
      <AppOverlays
        viewer={{
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
          onClose: () => closeMemory({ syncUrl: false }),
          deleteMemory: deleteMemoryFromViewer,
          onSaveMemoryInfo: saveMemoryInfo,
          onToggleFavorite: toggleMemoryFavorite,
          onSelectTag: () => {},
          onNeedAuth: () => setAuthOpen(true),
        }}
      />
    </section>
  );
}

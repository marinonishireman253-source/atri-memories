import { useCallback, useEffect, useMemo, useState } from 'react';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient.js';

function emptyFavoriteState() {
  return {
    ids: new Set(),
    orderedIds: [],
  };
}

function normalizeFavoriteRows(rows) {
  const orderedIds = (rows ?? []).map((row) => row.memory_id).filter(Boolean);
  return {
    ids: new Set(orderedIds),
    orderedIds,
  };
}

function isMissingFavoritesSchema(error) {
  return (
    error?.code === '42P01'
    || error?.message?.includes('memory_favorites')
    || error?.details?.includes?.('memory_favorites')
  );
}

export function useMemoryFavorites(user) {
  const [favoriteState, setFavoriteState] = useState(emptyFavoriteState);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [togglingFavoriteId, setTogglingFavoriteId] = useState(null);
  const [favoritesError, setFavoritesError] = useState('');
  const [favoritesAvailable, setFavoritesAvailable] = useState(hasSupabaseConfig);
  const [favoritesNotice, setFavoritesNotice] = useState('');

  const loadFavorites = useCallback(async () => {
    if (!user || !supabase) {
      setFavoriteState(emptyFavoriteState());
      setFavoritesError('');
      setFavoritesNotice('');
      return;
    }

    setLoadingFavorites(true);
    setFavoritesError('');

    try {
      const { data, error } = await supabase
        .from('memory_favorites')
        .select('memory_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavoritesAvailable(true);
      setFavoritesNotice('');
      setFavoriteState(normalizeFavoriteRows(data));
    } catch (error) {
      if (isMissingFavoritesSchema(error)) {
        setFavoritesAvailable(false);
        setFavoritesNotice('收藏功能正在等待站点数据库迁移完成，当前会先自动隐藏。');
        setFavoritesError('');
        setFavoriteState(emptyFavoriteState());
        return;
      }
      setFavoritesError('无法读取你的收藏列表，请稍后重试。');
    } finally {
      setLoadingFavorites(false);
    }
  }, [user]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = useCallback(async (memory) => {
    if (!user || !supabase) {
      throw new Error('请先登录后再收藏图片。');
    }
    if (!favoritesAvailable) {
      throw new Error('收藏功能尚未在当前站点启用。');
    }
    if (!memory?.id) {
      throw new Error('这张图片暂时无法收藏。');
    }

    const isFavorite = favoriteState.ids.has(memory.id);
    setTogglingFavoriteId(memory.id);
    setFavoritesError('');

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('memory_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('memory_id', memory.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('memory_favorites')
          .insert({ user_id: user.id, memory_id: memory.id });

        if (error) throw error;
      }

      await loadFavorites();
      return !isFavorite;
    } catch (error) {
      if (isMissingFavoritesSchema(error)) {
        setFavoritesAvailable(false);
        setFavoritesNotice('收藏功能正在等待站点数据库迁移完成，当前会先自动隐藏。');
        throw new Error('收藏功能尚未在当前站点启用。');
      }
      throw new Error(isFavorite ? '取消收藏失败，请稍后重试。' : '收藏失败，请稍后重试。');
    } finally {
      setTogglingFavoriteId(null);
    }
  }, [favoriteState.ids, favoritesAvailable, loadFavorites, user]);

  const favoriteIds = useMemo(() => favoriteState.ids, [favoriteState]);

  return {
    connected: hasSupabaseConfig,
    favoriteIds,
    favoriteOrderedIds: favoriteState.orderedIds,
    favoritesCount: favoriteState.orderedIds.length,
    favoritesAvailable,
    loadingFavorites,
    togglingFavoriteId,
    favoritesError,
    favoritesNotice,
    refreshFavorites: loadFavorites,
    toggleFavorite,
  };
}

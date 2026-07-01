import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_ADMIN_MEMORY_FILTERS, normalizeMemories } from '../lib/memoryContent.js';
import { hydrateMemoryMediaUrls } from '../lib/memoryMedia.js';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient.js';

const PAGE_SIZE = 24;

export function useAdminMemories() {
  const [memories, setMemories] = useState([]);
  const memoriesRef = useRef(memories);
  const [filters, setFilters] = useState(DEFAULT_ADMIN_MEMORY_FILTERS);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    total_storage_bytes: 0,
    unknown_size_count: 0,
    legacy_count: 0,
    hidden_count: 0,
    stats_limit: 1000,
  });
  const [backfillingSizes, setBackfillingSizes] = useState(false);
  const [backfillingThumbnails, setBackfillingThumbnails] = useState(false);

  useEffect(() => {
    memoriesRef.current = memories;
  }, [memories]);

  const loadMemories = useCallback(async ({ append = false } = {}) => {
    if (!supabase) {
      setMemories([]);
      setTotalCount(0);
      setHasMore(false);
      return;
    }

    const nextPage = append ? page + 1 : 0;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('manage-memories', {
        body: {
          action: 'list',
          page: nextPage,
          page_size: PAGE_SIZE,
          ...filters,
        },
      });

      if (invokeError) throw invokeError;

      const rows = await hydrateMemoryMediaUrls(normalizeMemories(data.memories ?? []));
      const nextMemories = append ? [...memoriesRef.current, ...rows] : rows;
      setMemories(nextMemories);
      setPage(data.page ?? nextPage);
      setTotalCount(data.total_count ?? nextMemories.length);
      setHasMore(Boolean(data.has_more));
      setStats({
        total_storage_bytes: data.stats?.total_storage_bytes ?? 0,
        unknown_size_count: data.stats?.unknown_size_count ?? 0,
        legacy_count: data.stats?.legacy_count ?? 0,
        hidden_count: data.stats?.hidden_count ?? 0,
        stats_limit: data.stats?.stats_limit ?? 1000,
      });
    } catch {
      setError('无法读取后台图片列表，请确认当前账号仍是管理员。');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadMemories({ append: false });
  }, [filters]);

  const updateFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const setOwnerFilter = ({ id, email }) => {
    setFilters((current) => ({
      ...current,
      ownerId: id,
      ownerLabel: email,
    }));
  };

  const clearOwnerFilter = () => {
    setFilters((current) => ({
      ...current,
      ownerId: 'all',
      ownerLabel: '',
    }));
  };

  const backfillSizes = async () => {
    if (!supabase) {
      throw new Error('当前为预览模式，无法回填图片大小。');
    }

    setBackfillingSizes(true);
    setError('');

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('manage-memories', {
        body: {
          action: 'backfill-sizes',
          limit: 30,
        },
      });

      if (invokeError) throw invokeError;
      await loadMemories({ append: false });
      return data;
    } catch {
      setError('回填图片大小失败，请稍后重试。');
      throw new Error('回填图片大小失败，请稍后重试。');
    } finally {
      setBackfillingSizes(false);
    }
  };

  const backfillThumbnails = async () => {
    if (!supabase) {
      throw new Error('当前为预览模式，无法回填缩略图。');
    }

    setBackfillingThumbnails(true);
    setError('');

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('manage-memories', {
        body: {
          action: 'backfill-thumbnails',
          limit: 30,
        },
      });

      if (invokeError) throw invokeError;
      await loadMemories({ append: false });
      return data;
    } catch {
      setError('回填缩略图失败，请稍后重试。');
      throw new Error('回填缩略图失败，请稍后重试。');
    } finally {
      setBackfillingThumbnails(false);
    }
  };

  return {
    connected: hasSupabaseConfig,
    memories,
    filters,
    loading,
    loadingMore,
    error,
    hasMore,
    totalCount,
    stats,
    backfillingSizes,
    backfillingThumbnails,
    refresh: () => loadMemories({ append: false }),
    loadMore: () => loadMemories({ append: true }),
    updateFilters,
    setOwnerFilter,
    clearOwnerFilter,
    backfillSizes,
    backfillThumbnails,
  };
}

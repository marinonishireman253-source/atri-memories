import { useCallback, useEffect, useRef, useState } from 'react';
import { demoMemories } from '../data/demoMemories.js';
import { filterMemoriesLocally } from '../lib/memoryContent.js';
import {
  deleteRemoteMemories,
  deleteRemoteMemory,
  updateRemoteMemory,
} from '../lib/memoryMutations.js';
import {
  loadFavoriteMemoryPage,
  loadMemoryById,
  loadMemoryPage,
} from '../lib/memoryQueries.js';
import { assertUploadPolicy, uploadMemoryEntry } from '../lib/memoryUpload.js';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient.js';

const DEFAULT_MAX_FILE_SIZE = 8 * 1024 * 1024;
const PAGE_SIZE = 18;
const UPLOAD_CONCURRENCY = 3;

async function runUploadQueue(entries, worker) {
  const results = new Array(entries.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(UPLOAD_CONCURRENCY, entries.length) },
    async () => {
      while (nextIndex < entries.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(entries[index]);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

export function useMemories({ user, isAdmin, filters, uploadMaxBytes = DEFAULT_MAX_FILE_SIZE }) {
  const [memories, setMemories] = useState(hasSupabaseConfig ? [] : demoMemories);
  const memoriesRef = useRef(memories);
  const [loading, setLoading] = useState(hasSupabaseConfig);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(hasSupabaseConfig ? 0 : demoMemories.length);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const loadingStateRef = useRef({ refresh: false, append: false });
  const requestSerialRef = useRef(0);

  useEffect(() => {
    memoriesRef.current = memories;
  }, [memories]);

  const loadMemories = useCallback(async ({ append = false } = {}) => {
    const loadingState = loadingStateRef.current;
    if (append && (loadingState.append || loadingState.refresh)) return;
    loadingStateRef.current = { refresh: !append, append };

    if (!supabase) {
      const demoSource = filters.favoritesOnly ? [] : demoMemories;
      const filteredDemo = filterMemoriesLocally(demoSource, filters);
      setMemories(filteredDemo);
      setTotalCount(filteredDemo.length);
      setHasMore(false);
      loadingStateRef.current = { refresh: false, append: false };
      return;
    }

    const currentMemories = memoriesRef.current;
    const from = append ? currentMemories.length : 0;
    const to = from + PAGE_SIZE - 1;
    const requestId = requestSerialRef.current + 1;
    requestSerialRef.current = requestId;
    const isStaleRequest = () => requestSerialRef.current !== requestId;

    if (filters.favoritesOnly) {
      if (!user) {
        setMemories([]);
        setTotalCount(0);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        loadingStateRef.current = { refresh: false, append: false };
        return;
      }

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError('');

      try {
        const page = await loadFavoriteMemoryPage({ userId: user.id, filters, from, to });
        if (isStaleRequest()) return;
        const nextMemories = append ? [...currentMemories, ...page.rows] : page.rows;
        setMemories(nextMemories);
        setTotalCount(page.totalCount);
        setHasMore(page.hasMore);
      } catch (favoritesScopeError) {
        if (isStaleRequest()) return;
        setError(`无法同步记忆：${favoritesScopeError.message}`);
      } finally {
        if (!isStaleRequest()) {
          setLoading(false);
          setLoadingMore(false);
          loadingStateRef.current = { refresh: false, append: false };
        }
      }
      return;
    }

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const page = await loadMemoryPage({ filters, from, to, withCount: !append });
      if (isStaleRequest()) return;
      const rows = page.rows;
      const nextMemories = append ? [...currentMemories, ...rows] : rows;
      setMemories(nextMemories);
      if (page.totalCount !== null) {
        setTotalCount(page.totalCount || nextMemories.length);
      }
      setHasMore(page.hasMore);
    } catch (queryError) {
      if (isStaleRequest()) return;
      setError(`无法同步记忆：${queryError.message}`);
    } finally {
      if (!isStaleRequest()) {
        setLoading(false);
        setLoadingMore(false);
        loadingStateRef.current = { refresh: false, append: false };
      }
    }
  }, [filters, user]);

  useEffect(() => {
    loadMemories({ append: false });
  }, [loadMemories]);

  const getMemoryById = useCallback(async (id) => {
    const cached = memoriesRef.current.find((memory) => memory.id === id);
    if (cached) return cached;

    if (!supabase) {
      return demoMemories.find((memory) => memory.id === id) ?? null;
    }

    setLoadingMemory(true);
    setError('');

    try {
      return await loadMemoryById({ id, user, isAdmin });
    } catch (queryError) {
      setError(`无法读取分享图片：${queryError.message}`);
      return null;
    } finally {
      setLoadingMemory(false);
    }
  }, [isAdmin, user]);

  const addMemories = async ({ entries, caption, tags, onProgress }) => {
    if (!supabase) {
      throw new Error('当前为预览模式，请配置 Supabase 环境变量后再上传。');
    }
    if (!user) {
      throw new Error('请先登录后再上传图片。');
    }
    if (!entries.length) {
      throw new Error('请选择需要收藏的图片。');
    }

    await assertUploadPolicy({ userId: user.id, isAdmin, entryCount: entries.length });

    setUploading(true);
    setError('');
    const results = [];

    try {
      const uploadResults = await runUploadQueue(entries, async (entry) => {
        onProgress?.(entry.id, { status: 'uploading', error: '' });

        try {
          await uploadMemoryEntry({
            entry,
            caption,
            tags,
            user,
            maxFileSize: uploadMaxBytes,
          });
          onProgress?.(entry.id, { status: 'success', error: '' });
          return { id: entry.id, success: true };
        } catch (entryError) {
          const message = entryError.message || '上传失败，请稍后重试。';
          onProgress?.(entry.id, { status: 'error', error: message });
          return { id: entry.id, success: false, error: message };
        }
      });
      results.push(...uploadResults);

      if (results.some((result) => result.success)) {
        await loadMemories({ append: false });
      }
      return results;
    } finally {
      setUploading(false);
    }
  };

  const canManageMemory = (memory) =>
    Boolean(user && (isAdmin || memory?.owner_id === user.id));

  const deleteMemory = async ({ memory }) => {
    if (!supabase) {
      throw new Error('当前为预览模式，无法删除图片。');
    }
    if (!canManageMemory(memory)) {
      throw new Error('你没有权限删除这张图片。');
    }

    setDeleting(true);
    setError('');

    try {
      await deleteRemoteMemory(memory.id);
      await loadMemories({ append: false });
    } finally {
      setDeleting(false);
    }
  };

  const deleteMemories = async (selectedMemories) => {
    if (!supabase) {
      throw new Error('当前为预览模式，无法删除图片。');
    }
    if (!selectedMemories.length) {
      throw new Error('请选择需要删除的图片。');
    }

    setDeleting(true);
    setError('');

    try {
      const results = await deleteRemoteMemories(selectedMemories, { canManageMemory });

      if (results.some((result) => result.success)) {
        await loadMemories({ append: false });
      }

      return results;
    } finally {
      setDeleting(false);
    }
  };

  const updateMemory = async ({ memory, title, caption, tags, isFeatured, visibilityStatus }) => {
    if (!supabase) {
      throw new Error('当前为预览模式，无法编辑图片信息。');
    }
    if (!canManageMemory(memory)) {
      throw new Error('你没有权限编辑这张图片。');
    }

    setUpdating(true);
    setError('');

    try {
      const updatedMemory = await updateRemoteMemory({
        memory,
        title,
        caption,
        tags,
        isFeatured,
        visibilityStatus,
        isAdmin,
      });
      await loadMemories({ append: false });
      return updatedMemory;
    } finally {
      setUpdating(false);
    }
  };

  return {
    connected: hasSupabaseConfig,
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
    refresh: () => loadMemories({ append: false }),
    loadMore: () => loadMemories({ append: true }),
    getMemoryById,
    addMemories,
    deleteMemory,
    deleteMemories,
    updateMemory,
    canManageMemory,
  };
}

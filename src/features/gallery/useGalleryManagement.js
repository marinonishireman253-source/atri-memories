import { useCallback, useEffect, useRef, useState } from 'react';
import { batchDeleteJourneyNotice } from '../../lib/userJourney.js';

export function useGalleryManagement({
  memories,
  user,
  galleryScope,
  deleteMemories,
  refreshSummary,
  refreshFavorites,
  showBatchDeleteCompleted,
}) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [activityById, setActivityById] = useState({});
  const [notice, setNotice] = useState(null);
  const activityTimersRef = useRef(new Map());

  useEffect(() => () => {
    for (const timer of activityTimersRef.current.values()) {
      window.clearTimeout(timer);
    }
    activityTimersRef.current.clear();
  }, []);

  useEffect(() => {
    setSelectedIds((current) => {
      if (!current.size) return current;
      const visibleIds = new Set(memories.map((memory) => memory.id));
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [memories]);

  useEffect(() => {
    if (!galleryScope.isCurrentUserScope) {
      setSelectedIds(new Set());
      setConfirmingDelete(false);
      setNotice(null);
    }
  }, [galleryScope.isCurrentUserScope]);

  const markActivity = useCallback((memoryId, activity) => {
    if (!memoryId || !activity) return;

    const existingTimer = activityTimersRef.current.get(memoryId);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    setActivityById((current) => ({
      ...current,
      [memoryId]: activity,
    }));

    const timer = window.setTimeout(() => {
      setActivityById((current) => {
        if (!current[memoryId]) return current;
        const next = { ...current };
        delete next[memoryId];
        return next;
      });
      activityTimersRef.current.delete(memoryId);
    }, 12000);

    activityTimersRef.current.set(memoryId, timer);
  }, []);

  const toggleSelected = useCallback((memoryId) => {
    setConfirmingDelete(false);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(memoryId)) {
        next.delete(memoryId);
      } else {
        next.add(memoryId);
      }
      return next;
    });
  }, []);

  const selectVisible = useCallback(() => {
    setConfirmingDelete(false);
    setSelectedIds(new Set(memories.map((memory) => memory.id)));
  }, [memories]);

  const clearSelection = useCallback(() => {
    setConfirmingDelete(false);
    setSelectedIds(new Set());
  }, []);

  const deleteSelected = useCallback(async () => {
    const selectedMemories = memories.filter((memory) => selectedIds.has(memory.id));
    if (!selectedMemories.length) return;

    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    const results = await deleteMemories(selectedMemories);
    const failedIds = new Set(results.filter((result) => !result.success).map((result) => result.id));
    const succeeded = results.filter((result) => result.success).length;
    const failed = results.length - succeeded;

    setSelectedIds(failedIds);
    setConfirmingDelete(false);
    for (const id of failedIds) {
      markActivity(id, { tone: 'warning', label: '待重试' });
    }
    await Promise.all([refreshSummary(), refreshFavorites()]);
    showBatchDeleteCompleted(user, succeeded, failed);
    setNotice(batchDeleteJourneyNotice({ succeeded, failed, user }));
  }, [memories, selectedIds, confirmingDelete, deleteMemories, refreshSummary, refreshFavorites, showBatchDeleteCompleted, user, markActivity]);

  return {
    selectedIds,
    confirmingDelete,
    activityById,
    notice,
    setNotice,
    markActivity,
    toggleSelected,
    selectVisible,
    clearSelection,
    deleteSelected,
  };
}

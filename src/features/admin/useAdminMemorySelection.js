import { useEffect, useMemo, useState } from 'react';

export function useAdminMemorySelection(memories) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const selectedMemories = useMemo(
    () => memories.filter((memory) => selectedIds.has(memory.id)),
    [memories, selectedIds],
  );

  useEffect(() => {
    setSelectedIds((current) => {
      const visibleIds = new Set(memories.map((memory) => memory.id));
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [memories]);

  const toggleMemory = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setConfirmingDelete(false);
  };

  const selectVisible = () => {
    setSelectedIds(new Set(memories.map((memory) => memory.id)));
    setConfirmingDelete(false);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setConfirmingDelete(false);
  };

  const removeSelectedIds = (ids) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setConfirmingDelete(false);
  };

  return {
    selectedIds,
    selectedMemories,
    confirmingDelete,
    setConfirmingDelete,
    toggleMemory,
    selectVisible,
    clearSelection,
    removeSelectedIds,
  };
}

export function galleryManageState({
  user,
  galleryScope,
  memories,
  selectedIds,
  deleting,
  loading,
  confirmingDelete,
}) {
  const enabled = Boolean(user && galleryScope?.isCurrentUserScope);
  const selectedCount = memories.filter((memory) => selectedIds.has(memory.id)).length;

  return {
    enabled,
    busy: deleting || loading,
    totalCount: memories.length,
    selectedCount,
    confirmingDelete,
  };
}

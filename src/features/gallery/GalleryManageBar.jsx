import { StatusNotice } from '../../components/StatusNotice.jsx';

export function GalleryManageBar({
  enabled,
  busy,
  selectedCount,
  totalCount,
  confirmingDelete,
  notice,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
}) {
  if (!enabled) {
    return null;
  }

  return (
    <div className="gallery-manage-bar" aria-label="我的图片批量整理">
      <div className="gallery-manage-copy">
        <strong>整理我的图片</strong>
        <p>
          当前范围内共有 {totalCount} 张，已选择 {selectedCount} 张。
          可以先挑出这一批，再统一删除。
        </p>
      </div>
      <div className="gallery-manage-actions">
        <button className="ghost-button compact" type="button" onClick={onSelectAll} disabled={busy || totalCount === 0}>
          全选当前
        </button>
        <button className="ghost-button compact" type="button" onClick={onClearSelection} disabled={busy || selectedCount === 0}>
          清空选择
        </button>
        <button
          className={`danger-button compact ${confirmingDelete ? 'confirmed' : ''}`}
          type="button"
          onClick={onDeleteSelected}
          disabled={busy || selectedCount === 0}
        >
          {confirmingDelete ? '确认删除' : '批量删除'}
        </button>
      </div>
      {notice && (
        <div className="gallery-manage-notice">
          <StatusNotice notice={notice} className="compact" />
        </div>
      )}
    </div>
  );
}

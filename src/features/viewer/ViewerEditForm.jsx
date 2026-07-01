import { normalizeTags } from '../../lib/tags.js';

export function ViewerEditForm({
  updating,
  hasNext,
  tagPresets,
  isAdmin,
  editTitle,
  editCaption,
  editTagText,
  editFeatured,
  editVisibilityStatus,
  editMessage,
  onEditTitleChange,
  onEditCaptionChange,
  onEditTagTextChange,
  onEditFeaturedChange,
  onEditVisibilityStatusChange,
  onCancel,
  onSubmit,
  onSubmitAndNext,
}) {
  return (
    <form className="edit-form" onSubmit={onSubmit}>
      <label htmlFor="edit-title">标题</label>
      <input
        id="edit-title"
        value={editTitle}
        onChange={(event) => onEditTitleChange(event.target.value)}
        maxLength="80"
        disabled={updating}
        required
      />
      <label htmlFor="edit-caption">描述</label>
      <textarea
        id="edit-caption"
        value={editCaption}
        onChange={(event) => onEditCaptionChange(event.target.value)}
        maxLength="280"
        rows="4"
        disabled={updating}
        placeholder="可选：补充这张图的说明"
      />
      <label htmlFor="edit-tags">标签</label>
      <input
        id="edit-tags"
        value={editTagText}
        onChange={(event) => onEditTagTextChange(event.target.value)}
        maxLength="160"
        disabled={updating}
        placeholder="例如：ATRI，背景，生成图"
      />
      <div className="tag-suggestions compact-tags" aria-label="推荐标签">
        {tagPresets.map((tag) => (
          <button
            type="button"
            className="tag-chip"
            key={tag}
            disabled={updating}
            onClick={() => {
              const nextTags = normalizeTags([...normalizeTags(editTagText), tag]);
              onEditTagTextChange(nextTags.join('，'));
            }}
          >
            {tag}
          </button>
        ))}
      </div>
      {isAdmin && (
        <>
          <label className="featured-toggle">
            <input
              type="checkbox"
              checked={editVisibilityStatus === 'public'}
              onChange={(event) => {
                const nextStatus = event.target.checked ? 'public' : 'hidden';
                onEditVisibilityStatusChange(nextStatus);
                if (nextStatus === 'hidden') onEditFeaturedChange(false);
              }}
              disabled={updating}
            />
            公开展示
          </label>
          <label className="featured-toggle">
            <input
              type="checkbox"
              checked={editFeatured}
              onChange={(event) => onEditFeaturedChange(event.target.checked)}
              disabled={updating || editVisibilityStatus !== 'public'}
            />
            设为首页精选
          </label>
        </>
      )}
      {editMessage && <p className="form-error">{editMessage}</p>}
      <div className="edit-actions">
        <button className="ghost-button" type="button" onClick={onCancel} disabled={updating}>
          取消
        </button>
        {hasNext && (
          <button className="ghost-button" type="button" onClick={onSubmitAndNext} disabled={updating}>
            {updating ? '保存中...' : '保存并下一张'}
          </button>
        )}
        <button className="primary-button" type="submit" disabled={updating}>
          {updating ? '保存中...' : '保存修改'}
        </button>
      </div>
    </form>
  );
}

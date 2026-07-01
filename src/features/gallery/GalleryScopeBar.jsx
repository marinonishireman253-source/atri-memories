export function GalleryScopeBar({
  summary,
  onFiltersChange,
  onShowMyImages,
  onShowFavorites,
  onShowAllImages,
  onResetFilters,
}) {
  if (!summary) {
    return null;
  }

  return (
    <div className="gallery-scope-bar" aria-label="当前画廊范围">
      <div className="gallery-scope-main">
        <div className="gallery-scope-copy">
          <div className="gallery-scope-head">
            <span className={`scope-pill ${summary.isCurrentUserScope || summary.isFavoritesScope ? 'active' : ''}`}>
              {summary.rangeLabel}
            </span>
            <strong>{summary.resultLabel}</strong>
          </div>
          <p>{summary.description}</p>
        </div>
        <div className="gallery-scope-actions">
          {summary.canShowMyImages && (
            <button className="ghost-button compact" type="button" onClick={onShowMyImages}>
              切到我的图片
            </button>
          )}
          {summary.canShowFavorites && (
            <button className="ghost-button compact" type="button" onClick={onShowFavorites}>
              查看我的收藏
            </button>
          )}
          {summary.canShowPublic && (
            <button className="ghost-button compact" type="button" onClick={onShowAllImages}>
              返回公开画廊
            </button>
          )}
          {summary.canResetFilters && (
            <button className="text-button inline" type="button" onClick={onResetFilters}>
              重置筛选
            </button>
          )}
        </div>
      </div>
      {summary.chips.length > 0 && (
        <div className="gallery-filter-chips">
          {summary.chips.map((chip) => (
            <span className="gallery-filter-chip" key={chip.key}>
              {chip.label}
              {chip.resetPatch && onFiltersChange && (
                <button
                  type="button"
                  onClick={() => onFiltersChange(chip.resetPatch)}
                  aria-label={`清除${chip.label}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

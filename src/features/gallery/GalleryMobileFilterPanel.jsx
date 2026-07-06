import { useState } from 'react';
import { GalleryFilters } from './GalleryFilters.jsx';
import { GalleryManageBar } from './GalleryManageBar.jsx';
import { GalleryScopeBar } from './GalleryScopeBar.jsx';

function MobileFilterChip({ chip, onFiltersChange }) {
  return (
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
  );
}

export function GalleryMobileFilterPanel({
  memories,
  loading,
  totalCount,
  filters,
  availableTags,
  scopeSummary,
  manageState,
  galleryManageNotice,
  onFiltersChange,
  onShowMyImages,
  onShowFavorites,
  onShowAllImages,
  onResetFilters,
  onSelectVisibleMemories,
  onClearSelectedMemories,
  onDeleteSelectedMemories,
}) {
  const [expanded, setExpanded] = useState(false);
  const scopeChip = scopeSummary?.isCurrentUserScope || scopeSummary?.isFavoritesScope
    ? { key: 'scope', label: scopeSummary.rangeLabel }
    : null;
  const chips = [
    ...(scopeChip ? [scopeChip] : []),
    ...(scopeSummary?.chips ?? []),
  ];
  const hasActiveSummary = chips.length > 0;

  return (
    <div className="gallery-mobile-filter-panel" aria-label="移动相册筛选">
      <label className="search-field mobile-gallery-search">
        <span>搜索</span>
        <input
          type="search"
          value={filters.query}
          onChange={(event) => onFiltersChange({ query: event.target.value })}
          placeholder="按标题、描述、标签或上传者查找"
        />
      </label>

      <div className="gallery-mobile-filter-summary">
        <div className="gallery-mobile-filter-chips" aria-label="当前筛选摘要">
          {hasActiveSummary ? (
            chips.map((chip) => (
              <MobileFilterChip
                chip={chip}
                key={chip.key}
                onFiltersChange={onFiltersChange}
              />
            ))
          ) : (
            <span className="gallery-filter-chip neutral">默认筛选</span>
          )}
        </div>
        <button
          className="ghost-button compact gallery-mobile-filter-toggle"
          type="button"
          aria-expanded={expanded}
          aria-controls="gallery-mobile-advanced-filters"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? '收起筛选' : '调整筛选'}
        </button>
      </div>

      <div
        className="gallery-mobile-advanced-filters"
        id="gallery-mobile-advanced-filters"
        hidden={!expanded}
      >
        <GalleryFilters
          memories={memories}
          loading={loading}
          totalCount={totalCount}
          filters={filters}
          availableTags={availableTags}
          onFiltersChange={onFiltersChange}
          hideSearch
        />
        <GalleryScopeBar
          summary={scopeSummary}
          onFiltersChange={onFiltersChange}
          onShowMyImages={onShowMyImages}
          onShowFavorites={onShowFavorites}
          onShowAllImages={onShowAllImages}
          onResetFilters={onResetFilters}
        />
        <GalleryManageBar
          enabled={manageState.enabled}
          busy={manageState.busy}
          selectedCount={manageState.selectedCount}
          totalCount={manageState.totalCount}
          confirmingDelete={manageState.confirmingDelete}
          notice={galleryManageNotice}
          onSelectAll={onSelectVisibleMemories}
          onClearSelection={onClearSelectedMemories}
          onDeleteSelected={onDeleteSelectedMemories}
        />
      </div>
    </div>
  );
}

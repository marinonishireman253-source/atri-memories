import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultTagPresets } from '../../lib/tags.js';
import { GalleryFilters } from './GalleryFilters.jsx';
import { GalleryManageBar } from './GalleryManageBar.jsx';
import { GalleryScopeBar } from './GalleryScopeBar.jsx';
import { GalleryEmptyState, GalleryLoadingCards } from './GalleryStates.jsx';
import { MemoryCard } from './MemoryCard.jsx';
import { galleryManageState } from './galleryManageModel.js';
import { galleryScopeSummary } from './galleryScopeModel.js';

const masonryColumnCount = 5;
const LOAD_MORE_AHEAD_PX = 1400;

function resolveMasonryColumnCount() {
  if (typeof window === 'undefined') return masonryColumnCount;
  if (window.matchMedia('(max-width: 620px)').matches) return 2;
  if (window.matchMedia('(orientation: landscape) and (min-width: 820px) and (max-height: 760px)').matches) return 4;
  if (window.matchMedia('(max-width: 900px)').matches) return 3;
  return masonryColumnCount;
}

function distributeMasonryColumns(items, columnCount = masonryColumnCount) {
  return items.reduce((columns, item, index) => {
    columns[index % columnCount].push({ item, index });
    return columns;
  }, Array.from({ length: columnCount }, () => []));
}

function useMasonryColumnCount() {
  const [columnCount, setColumnCount] = useState(resolveMasonryColumnCount);

  useEffect(() => {
    const updateColumnCount = () => setColumnCount(resolveMasonryColumnCount());
    updateColumnCount();

    const m1 = window.matchMedia('(max-width: 620px)');
    const m2 = window.matchMedia('(orientation: landscape) and (min-width: 820px) and (max-height: 760px)');
    const m3 = window.matchMedia('(max-width: 900px)');

    m1.addEventListener('change', updateColumnCount);
    m2.addEventListener('change', updateColumnCount);
    m3.addEventListener('change', updateColumnCount);

    return () => {
      m1.removeEventListener('change', updateColumnCount);
      m2.removeEventListener('change', updateColumnCount);
      m3.removeEventListener('change', updateColumnCount);
    };
  }, []);

  return columnCount;
}

export function Gallery({
  memories,
  loading,
  loadingMore,
  hasMore,
  totalCount,
  connected,
  user,
  filters,
  galleryScope,
  tagPresets = defaultTagPresets,
  onRefresh,
  onLoadMore,
  onFiltersChange,
  onShowMyImages,
  onShowFavorites,
  onShowAllImages,
  onResetFilters,
  favoriteIds,
  galleryActivityById,
  galleryManageNotice,
  gallerySelectedIds,
  onToggleMemorySelected,
  onSelectVisibleMemories,
  onClearSelectedMemories,
  onDeleteSelectedMemories,
  confirmingDeleteSelected,
  deleting,
  onClearOwnerFilter,
  onOpenMemory,
}) {
  const loadMoreSentinelRef = useRef(null);
  const availableTags = useMemo(() => {
    const tags = new Set(tagPresets);
    memories.forEach((memory) => {
      (memory.tags ?? []).forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  }, [memories, tagPresets]);
  const filtering = Boolean(
    filters.query.trim() ||
      filters.dateRange !== 'all' ||
      filters.tag !== 'all' ||
      filters.ownerId !== 'all',
  );
  const scopeSummary = galleryScopeSummary({
    user,
    galleryScope,
    filters,
    totalCount,
    loading,
    favoritesAvailable: onShowFavorites != null,
  });
  const manageState = galleryManageState({
    user,
    galleryScope,
    memories,
    selectedIds: gallerySelectedIds,
    deleting,
    loading,
    confirmingDelete: confirmingDeleteSelected,
  });
  const columnCount = useMasonryColumnCount();
  const masonryColumns = useMemo(
    () => distributeMasonryColumns(memories, columnCount),
    [columnCount, memories],
  );

  useEffect(() => {
    if (!hasMore || loading || loadingMore || !loadMoreSentinelRef.current) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMore?.();
        }
      },
      { rootMargin: `${LOAD_MORE_AHEAD_PX}px 0px` },
    );

    observer.observe(loadMoreSentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, loadingMore, onLoadMore]);

  return (
    <section className="gallery-panel glass-panel" id="gallery-panel">
      <div className="gallery-header-controls">
        <div className="card-packaging-seal" aria-hidden="true">
          <span className="seal-code">SYS-LOG // MODEL: ATRI-MDM-01</span>
          <span className="seal-barcode" />
          <span className="seal-logo">MEMORY CORE UNIT</span>
        </div>

        <div className="section-head">
          <div>
            <p className="eyebrow">YOUR TREASURED SCENES</p>
            <h2>
              <span className="section-accent" aria-hidden="true" />
              记忆碎片
            </h2>
          </div>
          <button className="refresh-button" onClick={onRefresh} disabled={loading}>
            <span className={loading ? 'spinner active' : 'spinner'} aria-hidden="true">
              ↻
            </span>
            {loading ? '正在同步' : connected ? '刷新空间' : '查看示例'}
          </button>
        </div>

        <GalleryFilters
          memories={memories}
          loading={loading}
          totalCount={totalCount}
          filters={filters}
          availableTags={availableTags}
          onFiltersChange={onFiltersChange}
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
        {filters.ownerId !== 'all' && (
          <div className="active-filter">
            <span>正在查看上传者：{filters.ownerLabel || filters.ownerId}</span>
            <button type="button" onClick={onClearOwnerFilter}>
              清除
            </button>
          </div>
        )}
      </div>

      {loading && memories.length === 0 ? (
        <GalleryLoadingCards />
      ) : memories.length === 0 ? (
        <GalleryEmptyState filtering={filtering} favoritesOnly={galleryScope.isFavoritesScope} />
      ) : (
        <>
          <div className="gallery-grid" style={{ '--gallery-masonry-columns': columnCount }}>
            {masonryColumns.map((column, columnIndex) => (
              <div className="gallery-column" key={`gallery-column-${columnIndex}`}>
                {column.map(({ item: memory, index }) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    priority={index < 2}
                    onOpenMemory={onOpenMemory}
                    selectable={manageState.enabled}
                    selected={gallerySelectedIds.has(memory.id)}
                    favorited={favoriteIds.has(memory.id)}
                    activityState={galleryActivityById[memory.id] ?? null}
                    onToggleSelected={onToggleMemorySelected}
                  />
                ))}
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="load-more-wrap">
              <span className="load-more-sentinel" ref={loadMoreSentinelRef} aria-hidden="true" />
              <button className="ghost-button" type="button" onClick={onLoadMore} disabled={loadingMore}>
                {loadingMore ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

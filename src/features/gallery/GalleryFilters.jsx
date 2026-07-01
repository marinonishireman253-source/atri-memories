import { PUBLIC_MEMORY_SORT_OPTIONS } from '../../lib/memoryContent.js';

export function GalleryFilters({
  memories,
  loading,
  totalCount,
  filters,
  availableTags,
  onFiltersChange,
  hideSearch = false,
}) {
  return (
    <div className="gallery-tools" aria-label="相册筛选">
      {!hideSearch && (
        <label className="search-field">
          <span>搜索</span>
          <input
            type="search"
            value={filters.query}
            onChange={(event) => onFiltersChange({ query: event.target.value })}
            placeholder="按标题、描述、标签或上传者查找"
          />
        </label>
      )}
      <label className="date-filter">
        <span>时间</span>
        <select value={filters.dateRange} onChange={(event) => onFiltersChange({ dateRange: event.target.value })}>
          <option value="all">全部时间</option>
          <option value="today">今天</option>
          <option value="week">最近 7 天</option>
          <option value="month">最近 30 天</option>
        </select>
      </label>
      <label className="date-filter">
        <span>标签</span>
        <select
          aria-label="标签筛选"
          value={filters.tag}
          onChange={(event) => onFiltersChange({ tag: event.target.value })}
        >
          <option value="all">全部标签</option>
          {availableTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </label>
      <label className="date-filter">
        <span>排序</span>
        <select
          value={`${filters.sortBy}:${filters.sortDir}`}
          onChange={(event) => {
            const [sortBy, sortDir] = event.target.value.split(':');
            onFiltersChange({ sortBy, sortDir });
          }}
        >
          {PUBLIC_MEMORY_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <p className="result-count">
        {loading ? '同步中' : `显示 ${memories.length} / ${totalCount} 张`}
      </p>
    </div>
  );
}

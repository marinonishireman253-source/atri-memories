import {
  DEFAULT_MEMORY_FILTERS,
  PUBLIC_MEMORY_SORT_OPTIONS,
} from '../../lib/memoryContent.js';

const DATE_RANGE_LABELS = {
  today: '今天',
  week: '最近 7 天',
  month: '最近 30 天',
};

function selectedSortLabel(filters) {
  const value = `${filters?.sortBy ?? DEFAULT_MEMORY_FILTERS.sortBy}:${filters?.sortDir ?? DEFAULT_MEMORY_FILTERS.sortDir}`;
  return PUBLIC_MEMORY_SORT_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function usesDefaultSort(filters) {
  return (
    (filters?.sortBy ?? DEFAULT_MEMORY_FILTERS.sortBy) === DEFAULT_MEMORY_FILTERS.sortBy &&
    (filters?.sortDir ?? DEFAULT_MEMORY_FILTERS.sortDir) === DEFAULT_MEMORY_FILTERS.sortDir
  );
}

export function buildGalleryFilterChips(filters = DEFAULT_MEMORY_FILTERS) {
  const chips = [];

  if (filters.query?.trim()) {
    chips.push({
      key: 'query',
      label: `搜索：${filters.query.trim()}`,
      resetPatch: { query: DEFAULT_MEMORY_FILTERS.query },
    });
  }

  if (filters.tag && filters.tag !== DEFAULT_MEMORY_FILTERS.tag) {
    chips.push({
      key: 'tag',
      label: `标签：${filters.tag}`,
      resetPatch: { tag: DEFAULT_MEMORY_FILTERS.tag },
    });
  }

  if (filters.dateRange && filters.dateRange !== DEFAULT_MEMORY_FILTERS.dateRange) {
    chips.push({
      key: 'date',
      label: `时间：${DATE_RANGE_LABELS[filters.dateRange] ?? filters.dateRange}`,
      resetPatch: { dateRange: DEFAULT_MEMORY_FILTERS.dateRange },
    });
  }

  if (!usesDefaultSort(filters)) {
    chips.push({
      key: 'sort',
      label: `排序：${selectedSortLabel(filters)}`,
      resetPatch: {
        sortBy: DEFAULT_MEMORY_FILTERS.sortBy,
        sortDir: DEFAULT_MEMORY_FILTERS.sortDir,
      },
    });
  }

  return chips;
}

export function hasGalleryRefinements(filters = DEFAULT_MEMORY_FILTERS) {
  return buildGalleryFilterChips(filters).length > 0;
}

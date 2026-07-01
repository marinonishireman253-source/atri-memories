import { normalizeTags } from './tags.js';
import { normalizeReportSummary } from './reporting.js';

export const MEMORY_VISIBILITY_PUBLIC = 'public';
export const MEMORY_VISIBILITY_HIDDEN = 'hidden';

export const MEMORY_COLUMNS =
  'id, title, caption, image_url, storage_path, owner_id, owner_email, tags, file_size_bytes, is_featured, visibility_status, created_at';

export const DEFAULT_MEMORY_FILTERS = {
  query: '',
  dateRange: 'all',
  tag: 'all',
  ownerId: 'all',
  ownerLabel: '',
  favoritesOnly: false,
  sortBy: 'created_at',
  sortDir: 'desc',
};

export const DEFAULT_ADMIN_MEMORY_FILTERS = {
  ...DEFAULT_MEMORY_FILTERS,
  visibility: 'all',
};

export const PUBLIC_MEMORY_SORT_OPTIONS = [
  { value: 'created_at:desc', label: '最新上传' },
  { value: 'created_at:asc', label: '最早上传' },
  { value: 'title:asc', label: '标题 A-Z' },
  { value: 'title:desc', label: '标题 Z-A' },
  { value: 'owner_email:asc', label: '上传者 A-Z' },
  { value: 'file_size_bytes:desc', label: '文件最大' },
  { value: 'file_size_bytes:asc', label: '文件最小' },
];

export function memoryTitle(memory) {
  return memory?.title?.trim() || '未命名记忆';
}

export function memoryCaption(memory) {
  return memory?.caption?.trim() || '';
}

export function memoryDescription(memory, fallback = '') {
  return memoryCaption(memory) || fallback;
}

export function isPublicMemory(memory) {
  return (memory?.visibility_status ?? MEMORY_VISIBILITY_PUBLIC) === MEMORY_VISIBILITY_PUBLIC;
}

export function isHiddenMemory(memory) {
  return (memory?.visibility_status ?? MEMORY_VISIBILITY_PUBLIC) === MEMORY_VISIBILITY_HIDDEN;
}

export function isFeaturedMemory(memory) {
  return Boolean(memory?.is_featured);
}

export function normalizeMemory(memory) {
  if (!memory) return memory;

  return {
    ...memory,
    title: memoryTitle(memory),
    caption: memoryCaption(memory) || null,
    tags: normalizeTags(memory.tags ?? []),
    is_featured: Boolean(memory.is_featured),
    visibility_status: memory.visibility_status ?? MEMORY_VISIBILITY_PUBLIC,
    report_summary: normalizeReportSummary(memory.report_summary),
  };
}

export function normalizeMemories(rows) {
  return (rows ?? []).map(normalizeMemory);
}

export function cleanMemorySearchQuery(value) {
  return String(value ?? '').trim().replace(/[,%]/g, ' ').replace(/\s+/g, ' ');
}

export function memorySearchText(memory) {
  const normalized = normalizeMemory(memory);
  return [
    memoryTitle(normalized),
    memoryCaption(normalized),
    normalized.owner_email ?? '',
    ...(normalized.tags ?? []),
  ]
    .join(' ')
    .toLowerCase();
}

export function memorySortKey(memory, sortBy) {
  const normalized = normalizeMemory(memory);
  if (sortBy === 'title') {
    return memoryTitle(normalized).toLowerCase();
  }
  if (sortBy === 'owner_email') {
    return String(normalized.owner_email ?? '').toLowerCase();
  }
  if (sortBy === 'created_at') {
    return new Date(normalized.created_at ?? 0).getTime();
  }
  return normalized[sortBy];
}

export function sortMemories(memories, filters) {
  const sortBy = filters.sortBy ?? 'created_at';
  const sortDir = filters.sortDir ?? 'desc';
  const factor = sortDir === 'asc' ? 1 : -1;

  return [...(memories ?? [])].sort((left, right) => {
    const leftKey = memorySortKey(left, sortBy);
    const rightKey = memorySortKey(right, sortBy);

    if (leftKey === rightKey) {
      return factor * (new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime());
    }
    if (leftKey == null) return 1;
    if (rightKey == null) return -1;
    if (typeof leftKey === 'number' && typeof rightKey === 'number') {
      return factor * (leftKey - rightKey);
    }
    return factor * String(leftKey).localeCompare(String(rightKey), 'zh-CN', { numeric: true });
  });
}

export function startDateForRange(range) {
  const now = new Date();
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }
  if (range === 'week') {
    return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (range === 'month') {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  return null;
}

export function applyMemoryFilters(query, filters) {
  const searchQuery = cleanMemorySearchQuery(filters.query ?? '');
  const startDate = startDateForRange(filters.dateRange);
  const selectedTag = filters.tag ?? 'all';
  const ownerId = filters.ownerId ?? 'all';

  let nextQuery = query;

  if (searchQuery) {
    const pattern = `*${searchQuery}*`;
    nextQuery = nextQuery.or(
      [
        `title.ilike.${pattern}`,
        `caption.ilike.${pattern}`,
        `owner_email.ilike.${pattern}`,
        `storage_path.ilike.${pattern}`,
      ].join(','),
    );
  }
  if (startDate) {
    nextQuery = nextQuery.gte('created_at', startDate);
  }
  if (selectedTag !== 'all') {
    nextQuery = nextQuery.contains('tags', [selectedTag]);
  }
  if (ownerId !== 'all') {
    nextQuery = nextQuery.eq('owner_id', ownerId);
  }

  const sortBy = filters.sortBy ?? 'created_at';
  const sortDir = filters.sortDir ?? 'desc';
  nextQuery = nextQuery.order(sortBy, { ascending: sortDir === 'asc' });

  return nextQuery;
}

export function filterMemoriesLocally(memories, filters) {
  const query = cleanMemorySearchQuery(filters.query ?? '').toLowerCase();
  const startDate = startDateForRange(filters.dateRange);
  const tag = filters.tag ?? 'all';
  const ownerId = filters.ownerId ?? 'all';

  const filtered = memories.filter((memory) => {
    const normalized = normalizeMemory(memory);
    return (
      (!query || memorySearchText(normalized).includes(query)) &&
      (!startDate || new Date(normalized.created_at).getTime() >= new Date(startDate).getTime()) &&
      (tag === 'all' || normalized.tags.includes(tag)) &&
      (ownerId === 'all' || normalized.owner_id === ownerId)
    );
  });

  return sortMemories(filtered, filters);
}

export function ownerScopedFilters(user) {
  if (!user) return DEFAULT_MEMORY_FILTERS;
  return {
    ...DEFAULT_MEMORY_FILTERS,
    ownerId: user.id,
    ownerLabel: user.email ?? user.id,
  };
}

export function favoriteScopedFilters() {
  return {
    ...DEFAULT_MEMORY_FILTERS,
    favoritesOnly: true,
  };
}

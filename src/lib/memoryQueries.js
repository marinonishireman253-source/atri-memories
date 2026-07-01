import {
  applyMemoryFilters,
  filterMemoriesLocally,
  MEMORY_COLUMNS,
  MEMORY_VISIBILITY_PUBLIC,
  normalizeMemories,
} from './memoryContent.js';
import { hydrateMemoryMediaUrl, hydrateMemoryMediaUrls } from './memoryMedia.js';
import { normalizeReportSummary } from './reporting.js';
import { supabase } from './supabaseClient.js';

export async function attachAdminReportSummary(memory, { isAdmin }) {
  if (!supabase || !memory?.id || !isAdmin) {
    return memory;
  }

  try {
    const { data, error } = await supabase
      .from('memory_reports')
      .select('status')
      .eq('memory_id', memory.id);

    if (error) throw error;

    const summary = normalizeReportSummary();
    for (const row of data ?? []) {
      if (row.status === 'open') summary.open_count += 1;
      if (row.status === 'resolved') summary.resolved_count += 1;
      if (row.status === 'dismissed') summary.dismissed_count += 1;
    }

    return {
      ...memory,
      report_summary: summary,
    };
  } catch {
    return memory;
  }
}

export async function loadFavoriteMemoryPage({ userId, filters, from, to }) {
  const { data: favoriteRows, error: favoritesError } = await supabase
    .from('memory_favorites')
    .select('memory_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (favoritesError) throw favoritesError;

  const favoriteIds = (favoriteRows ?? []).map((row) => row.memory_id).filter(Boolean);
  if (!favoriteIds.length) {
    return {
      rows: [],
      totalCount: 0,
      hasMore: false,
    };
  }

  const { data: memoryRows, error: queryError } = await supabase
    .from('memories')
    .select(MEMORY_COLUMNS)
    .in('id', favoriteIds);

  if (queryError) throw queryError;

  const order = new Map(favoriteIds.map((id, index) => [id, index]));
  const orderedRows = normalizeMemories(memoryRows)
    .sort((left, right) => (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.id) ?? Number.MAX_SAFE_INTEGER));
  const hydratedRows = await hydrateMemoryMediaUrls(orderedRows);
  const filteredRows = filterMemoriesLocally(hydratedRows, filters);
  const rows = filteredRows.slice(from, to + 1);

  return {
    rows,
    totalCount: filteredRows.length,
    hasMore: from + rows.length < filteredRows.length,
  };
}

export async function loadMemoryPage({ filters, from, to, withCount = true }) {
  const pageSize = to - from + 1;
  const queryTo = withCount ? to : to + 1;
  const baseQuery = supabase
    .from('memories')
    .select(MEMORY_COLUMNS, withCount ? { count: 'exact' } : undefined);

  const scopedQuery = filters.ownerId === 'all'
    ? baseQuery.eq('visibility_status', MEMORY_VISIBILITY_PUBLIC)
    : baseQuery;

  const { data, error, count } = await applyMemoryFilters(scopedQuery, filters)
    .range(from, queryTo);

  if (error) throw error;

  const fetchedRows = normalizeMemories(data);
  const rows = fetchedRows.slice(0, pageSize);
  const hasMore = withCount
    ? from + rows.length < (count ?? 0)
    : fetchedRows.length > pageSize;

  return {
    rows: await hydrateMemoryMediaUrls(rows, { mode: 'gallery' }),
    totalCount: withCount ? count ?? 0 : null,
    hasMore,
  };
}

export async function loadMemoryById({ id, user, isAdmin }) {
  let memoryQuery = supabase
    .from('memories')
    .select(MEMORY_COLUMNS)
    .eq('id', id);

  if (!isAdmin) {
    memoryQuery = user
      ? memoryQuery.or(`visibility_status.eq.${MEMORY_VISIBILITY_PUBLIC},owner_id.eq.${user.id}`)
      : memoryQuery.eq('visibility_status', MEMORY_VISIBILITY_PUBLIC);
  }

  const { data, error } = await memoryQuery.maybeSingle();

  if (error) throw error;

  const nextMemory = await hydrateMemoryMediaUrl(normalizeMemories(data ? [data] : [])[0] ?? null);
  return attachAdminReportSummary(nextMemory, { isAdmin });
}

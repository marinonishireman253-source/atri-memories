import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MEMORY_COLUMNS =
  'id, title, caption, image_url, storage_path, owner_id, owner_email, tags, file_size_bytes, is_featured, visibility_status, created_at';
const PAGE_SIZE_DEFAULT = 24;
const PAGE_SIZE_MAX = 100;
const STATS_LIMIT = 1000;
const BACKFILL_LIMIT_MAX = 50;
type AdminSupabaseClient = any;

function response(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function cleanSearchQuery(value: unknown) {
  return String(value ?? '').trim().replace(/[,%]/g, ' ').replace(/\s+/g, ' ');
}

function startDateForRange(range: unknown) {
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

function isUuid(value: unknown) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function clampPageSize(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return PAGE_SIZE_DEFAULT;
  return Math.min(PAGE_SIZE_MAX, Math.max(1, Math.floor(parsed)));
}

function clampBackfillLimit(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(BACKFILL_LIMIT_MAX, Math.max(1, Math.floor(parsed)));
}

function applyFilters(query: any, filters: Record<string, unknown>) {
  const searchQuery = cleanSearchQuery(filters.query);
  const startDate = startDateForRange(filters.dateRange);
  const selectedTag = typeof filters.tag === 'string' ? filters.tag : 'all';
  const ownerId = isUuid(filters.ownerId) ? filters.ownerId : 'all';
  const visibility = typeof filters.visibility === 'string' ? filters.visibility : 'all';

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
  if (visibility === 'public' || visibility === 'hidden') {
    nextQuery = nextQuery.eq('visibility_status', visibility);
  }

  return nextQuery;
}

function sortConfig(sortBy: unknown, sortDir: unknown) {
  const allowed = new Set(['created_at', 'title', 'owner_email', 'file_size_bytes']);
  const column = typeof sortBy === 'string' && allowed.has(sortBy) ? sortBy : 'created_at';
  const ascending = sortDir === 'asc';
  return { column, ascending };
}

async function attachReportSummaries(
  supabase: AdminSupabaseClient,
  memories: Array<Record<string, unknown>>,
) {
  const ids = memories.map((memory) => memory.id).filter(isUuid) as string[];
  if (!ids.length) return memories;

  const { data: reportRows, error } = await supabase
    .from('memory_reports')
    .select('memory_id, status')
    .in('memory_id', ids);

  if (error) throw error;

  const summaryById = new Map<string, { open_count: number; resolved_count: number; dismissed_count: number }>();
  for (const id of ids) {
    summaryById.set(id, {
      open_count: 0,
      resolved_count: 0,
      dismissed_count: 0,
    });
  }

  for (const row of reportRows ?? []) {
    const summary = summaryById.get(row.memory_id);
    if (!summary) continue;
    if (row.status === 'open') summary.open_count += 1;
    if (row.status === 'resolved') summary.resolved_count += 1;
    if (row.status === 'dismissed') summary.dismissed_count += 1;
  }

  return memories.map((memory) => ({
    ...memory,
    report_summary: summaryById.get(String(memory.id)) ?? {
      open_count: 0,
      resolved_count: 0,
      dismissed_count: 0,
    },
  }));
}

async function requireAdmin(request: Request) {
  const authHeader = request.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return { error: response({ error: 'Unauthorized.' }, 401) };

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  ) as AdminSupabaseClient;

  const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !authData.user) {
    return { error: response({ error: 'Unauthorized.' }, 401) };
  }

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (!adminRow) return { error: response({ error: 'Forbidden.' }, 403) };
  return { supabase };
}

async function listMemories(supabase: AdminSupabaseClient, body: Record<string, unknown>) {
  const pageSize = clampPageSize(body.page_size);
  const page = Math.max(0, Math.floor(Number(body.page) || 0));
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { column, ascending } = sortConfig(body.sortBy, body.sortDir);

  const baseQuery = supabase
    .from('memories')
    .select(MEMORY_COLUMNS, { count: 'exact' });

  const { data, error, count } = await applyFilters(baseQuery, body)
    .order(column, { ascending, nullsFirst: false })
    .range(from, to);

  if (error) return response({ error: 'Unable to list memories.' }, 500);

  const statsQuery = supabase
    .from('memories')
    .select('id, owner_id, file_size_bytes, visibility_status');

  const { data: statsRows, error: statsError } = await applyFilters(statsQuery, body).limit(STATS_LIMIT);
  if (statsError) return response({ error: 'Unable to calculate memory stats.' }, 500);

  let totalStorageBytes = 0;
  let unknownSizeCount = 0;
  let legacyCount = 0;
  let hiddenCount = 0;

  for (const row of statsRows ?? []) {
    if (!row.owner_id) legacyCount += 1;
    if (row.visibility_status === 'hidden') hiddenCount += 1;
    if (typeof row.file_size_bytes === 'number') {
      totalStorageBytes += row.file_size_bytes;
    } else {
      unknownSizeCount += 1;
    }
  }

  const memoriesWithReports = await attachReportSummaries(supabase, data ?? []);
  const loaded = from + memoriesWithReports.length;
  return response(
    {
      memories: memoriesWithReports,
      total_count: count ?? 0,
      has_more: loaded < (count ?? 0),
      page,
      page_size: pageSize,
      stats: {
        total_storage_bytes: totalStorageBytes,
        unknown_size_count: unknownSizeCount,
        legacy_count: legacyCount,
        hidden_count: hiddenCount,
        stats_limit: STATS_LIMIT,
      },
    },
    200,
  );
}

async function backfillSizes(supabase: AdminSupabaseClient, body: Record<string, unknown>) {
  const limit = clampBackfillLimit(body.limit);
  const { data: rows, error } = await supabase
    .from('memories')
    .select('id, image_url, storage_path')
    .is('file_size_bytes', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) return response({ error: 'Unable to list memories for backfill.' }, 500);

  let updated = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    try {
      let mediaUrl = row.image_url;
      if (row.storage_path) {
        const { data: signedData } = await supabase.storage
          .from('atri-images')
          .createSignedUrl(row.storage_path, 60 * 10);
        mediaUrl = signedData?.signedUrl ?? mediaUrl;
      }

      const headResponse = await fetch(mediaUrl, { method: 'HEAD' });
      const contentLength = Number(headResponse.headers.get('content-length'));
      if (!headResponse.ok || !Number.isFinite(contentLength) || contentLength < 0) {
        failed += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from('memories')
        .update({ file_size_bytes: Math.floor(contentLength) })
        .eq('id', row.id);

      if (updateError) {
        failed += 1;
      } else {
        updated += 1;
      }
    } catch {
      failed += 1;
    }
  }

  const { count } = await supabase
    .from('memories')
    .select('id', { count: 'exact', head: true })
    .is('file_size_bytes', null);

  return response(
    {
      processed: rows?.length ?? 0,
      updated,
      failed,
      remaining_unknown: count ?? 0,
    },
    200,
  );
}

function thumbnailProxyUrl(sourceUrl: string) {
  return `https://wsrv.nl/?url=${encodeURIComponent(sourceUrl)}&w=320&h=900&fit=inside&we&output=webp&q=58`;
}

function thumbnailPathFor(storagePath: string, memoryId: string) {
  const match = storagePath.match(/^public\/([^/]+)\/([^/.]+)\.[a-z0-9]+$/i);
  if (match) return `public/${match[1]}/thumbs/${match[2]}.webp`;
  return `public/legacy/thumbs/${memoryId}.webp`;
}

async function backfillThumbnails(supabase: AdminSupabaseClient, body: Record<string, unknown>) {
  const limit = clampBackfillLimit(body.limit);
  const { data: rows, error } = await supabase
    .from('memories')
    .select('id, image_url, storage_path, owner_id')
    .not('storage_path', 'is', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) return response({ error: 'Unable to list memories for thumbnail backfill.' }, 500);

  let updated = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    try {
      const { data: signedData } = await supabase.storage
        .from('atri-images')
        .createSignedUrl(row.storage_path, 60 * 10);
      const sourceUrl = signedData?.signedUrl ?? row.image_url;
      if (!sourceUrl) {
        failed += 1;
        continue;
      }

      const thumbnailResponse = await fetch(thumbnailProxyUrl(sourceUrl));
      if (!thumbnailResponse.ok) {
        failed += 1;
        continue;
      }

      const thumbnailBytes = new Uint8Array(await thumbnailResponse.arrayBuffer());
      const thumbnailPath = thumbnailPathFor(row.storage_path, row.id);
      const { data: existingThumbnail } = await supabase.storage
        .from('atri-images')
        .createSignedUrl(thumbnailPath, 60 * 10);
      if (existingThumbnail?.signedUrl) {
        const existingHead = await fetch(existingThumbnail.signedUrl, { method: 'HEAD' });
        if (existingHead.ok) {
          updated += 1;
          continue;
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('atri-images')
        .upload(thumbnailPath, thumbnailBytes, {
          cacheControl: '31536000',
          contentType: 'image/webp',
          upsert: true,
        });

      if (uploadError) {
        failed += 1;
        continue;
      }

      updated += 1;
    } catch {
      failed += 1;
    }
  }

  return response(
    {
      processed: rows?.length ?? 0,
      updated,
      failed,
    },
    200,
  );
}

Deno.serve(async (request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return response({ error: 'Method not allowed.' }, 405);
  }

  const admin = await requireAdmin(request);
  if ('error' in admin) return admin.error as Response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return response({ error: 'Invalid request.' }, 400);
  }

  if (body.action === 'list') {
    return listMemories(admin.supabase, body);
  }

  if (body.action === 'backfill-sizes') {
    return backfillSizes(admin.supabase, body);
  }

  if (body.action === 'backfill-thumbnails') {
    return backfillThumbnails(admin.supabase, body);
  }

  return response({ error: 'Unknown action.' }, 400);
});

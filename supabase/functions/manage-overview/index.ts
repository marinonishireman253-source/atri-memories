import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STATS_LIMIT = 5000;
const AUTH_USERS_PAGE_SIZE = 1000;
type AdminSupabaseClient = any;

function response(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

async function exactCount(
  supabase: AdminSupabaseClient,
  table: string,
  apply?: (query: any) => any,
) {
  const baseQuery = supabase.from(table).select('*', { count: 'exact', head: true });
  const query = apply ? apply(baseQuery) : baseQuery;
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function attachReportSummaries(
  supabase: AdminSupabaseClient,
  memories: Array<Record<string, unknown>>,
) {
  const ids = memories
    .map((memory) => memory.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
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

async function listAllAuthUsers(supabase: AdminSupabaseClient) {
  const allUsers = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_USERS_PAGE_SIZE,
    });
    if (error) throw error;

    allUsers.push(...(data.users ?? []));
    if ((data.users ?? []).length < AUTH_USERS_PAGE_SIZE) break;
    page += 1;
  }

  return allUsers;
}

async function buildOverview(supabase: AdminSupabaseClient) {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const before72h = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  const [
    totalMemories,
    uploaded24h,
    uploaded7d,
    featuredCount,
    unknownSizeCount,
    legacyCount,
    hiddenCount,
    openReportsCount,
    resolvedReportsCount,
    dismissedReportsCount,
    adminCount,
  ] = await Promise.all([
    exactCount(supabase, 'memories'),
    exactCount(supabase, 'memories', (query) => query.gte('created_at', since24h)),
    exactCount(supabase, 'memories', (query) => query.gte('created_at', since7d)),
    exactCount(supabase, 'memories', (query) => query.eq('is_featured', true)),
    exactCount(supabase, 'memories', (query) => query.is('file_size_bytes', null)),
    exactCount(supabase, 'memories', (query) => query.is('owner_id', null)),
    exactCount(supabase, 'memories', (query) => query.eq('visibility_status', 'hidden')),
    exactCount(supabase, 'memory_reports', (query) => query.eq('status', 'open')),
    exactCount(supabase, 'memory_reports', (query) => query.eq('status', 'resolved')),
    exactCount(supabase, 'memory_reports', (query) => query.eq('status', 'dismissed')),
    exactCount(supabase, 'admin_users'),
  ]);

  const authUsers = await listAllAuthUsers(supabase);

  const { data: profileRows, error: profileError } = await supabase
    .from('user_profiles')
    .select('can_upload, upload_limit_total');
  if (profileError) throw profileError;

  const { data: siteSettingRows, error: siteSettingsError } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['uploads_enabled', 'registrations_enabled']);
  if (siteSettingsError) throw siteSettingsError;

  const confirmedUserCount = authUsers.filter((user: any) => user.email_confirmed_at).length;
  const signedInUserCount = authUsers.filter((user: any) => user.last_sign_in_at).length;
  const invitedPendingUserCount = authUsers.filter(
    (user: any) => user.invited_at && !user.email_confirmed_at,
  ).length;
  const registrations24h = authUsers.filter(
    (user: any) =>
      !user.invited_at
      && typeof user.created_at === 'string'
      && user.created_at >= since24h,
  ).length;
  const registrations7d = authUsers.filter(
    (user: any) =>
      !user.invited_at
      && typeof user.created_at === 'string'
      && user.created_at >= since7d,
  ).length;
  const invitesSent24h = authUsers.filter(
    (user: any) =>
      typeof user.invited_at === 'string'
      && user.invited_at >= since24h,
  ).length;
  const invitesSent7d = authUsers.filter(
    (user: any) =>
      typeof user.invited_at === 'string'
      && user.invited_at >= since7d,
  ).length;
  const recentUnconfirmedRegistrations24h = authUsers.filter(
    (user: any) =>
      !user.invited_at
      && !user.email_confirmed_at
      && typeof user.created_at === 'string'
      && user.created_at >= since24h,
  ).length;
  const staleUnconfirmedUsers = authUsers.filter(
    (user: any) =>
      !user.invited_at
      && !user.email_confirmed_at
      && typeof user.created_at === 'string'
      && user.created_at < before72h,
  ).length;
  const staleInvitedPendingUsers = authUsers.filter(
    (user: any) =>
      typeof user.invited_at === 'string'
      && user.invited_at < before72h
      && !user.email_confirmed_at,
  ).length;
  const disabledUploadUserCount = (profileRows ?? []).filter((profile: any) => profile.can_upload === false).length;
  const quotaLimitedUserCount = (profileRows ?? []).filter(
    (profile: any) => typeof profile.upload_limit_total === 'number',
  ).length;
  const siteSettings = new Map((siteSettingRows ?? []).map((row: any) => [row.key, row.value]));

  const { data: sizeRows, error: sizeError } = await supabase
    .from('memories')
    .select('owner_id, file_size_bytes')
    .order('created_at', { ascending: false })
    .limit(STATS_LIMIT);
  if (sizeError) throw sizeError;

  let totalStorageBytes = 0;
  const uploaderIds = new Set<string>();
  for (const row of sizeRows ?? []) {
    if (typeof row.file_size_bytes === 'number') {
      totalStorageBytes += row.file_size_bytes;
    }
    if (row.owner_id) uploaderIds.add(row.owner_id);
  }

  const { data: recentMemories, error: recentMemoriesError } = await supabase
    .from('memories')
    .select('id, title, caption, image_url, storage_path, owner_id, owner_email, tags, file_size_bytes, is_featured, visibility_status, created_at')
    .eq('visibility_status', 'public')
    .order('created_at', { ascending: false })
    .limit(6);
  if (recentMemoriesError) throw recentMemoriesError;

  const { data: recentLogs, error: recentLogsError } = await supabase
    .from('admin_audit_logs')
    .select('id, actor_email, action, target_label, created_at')
    .order('created_at', { ascending: false })
    .limit(6);
  if (recentLogsError) throw recentLogsError;

  return {
    summary: {
      total_memories: totalMemories,
      uploaded_24h: uploaded24h,
      uploaded_7d: uploaded7d,
      featured_count: featuredCount,
      unknown_size_count: unknownSizeCount,
      legacy_count: legacyCount,
      hidden_count: hiddenCount,
      open_reports_count: openReportsCount,
      resolved_reports_count: resolvedReportsCount,
      dismissed_reports_count: dismissedReportsCount,
      total_storage_bytes: totalStorageBytes,
      storage_stats_limit: STATS_LIMIT,
      total_users: authUsers.length,
      confirmed_users: confirmedUserCount,
      unconfirmed_users: authUsers.length - confirmedUserCount,
      invited_pending_users: invitedPendingUserCount,
      signed_in_users: signedInUserCount,
      admin_count: adminCount,
      active_uploader_count: uploaderIds.size,
      disabled_upload_users: disabledUploadUserCount,
      quota_limited_users: quotaLimitedUserCount,
      uploads_enabled: siteSettings.get('uploads_enabled') !== false,
      registrations_enabled: siteSettings.get('registrations_enabled') !== false,
      registrations_24h: registrations24h,
      registrations_7d: registrations7d,
      invites_sent_24h: invitesSent24h,
      invites_sent_7d: invitesSent7d,
      recent_unconfirmed_registrations_24h: recentUnconfirmedRegistrations24h,
      stale_unconfirmed_users: staleUnconfirmedUsers,
      stale_invited_pending_users: staleInvitedPendingUsers,
      user_stats_limit: 1000,
    },
    recent_memories: await attachReportSummaries(supabase, recentMemories ?? []),
    recent_logs: recentLogs ?? [],
  };
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

  if (body.action !== 'summary') {
    return response({ error: 'Unknown action.' }, 400);
  }

  try {
    return response(await buildOverview(admin.supabase), 200);
  } catch {
    return response({ error: 'Unable to build overview.' }, 500);
  }
});

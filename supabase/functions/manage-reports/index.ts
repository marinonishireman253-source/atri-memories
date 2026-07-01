import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const REPORT_COLUMNS =
  'id, memory_id, reporter_user_id, reporter_email, reason, note, status, resolution_note, resolved_by, resolved_at, created_at, memories(id, title, image_url, storage_path, owner_id, owner_email, visibility_status)';

type AdminSupabaseClient = any;

function response(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isUuid(value: unknown) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
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
  return { supabase, user: authData.user };
}

async function writeAuditLog(
  supabase: AdminSupabaseClient,
  {
    actorUserId,
    actorEmail,
    report,
    status,
    resolutionNote,
  }: {
    actorUserId: string;
    actorEmail: string | null;
    report: any;
    status: string;
    resolutionNote: string | null;
  },
) {
  await supabase.from('admin_audit_logs').insert({
    actor_user_id: actorUserId,
    actor_email: actorEmail,
    action: 'resolve_report',
    target_type: 'memory',
    target_id: report.memory_id,
    target_label: report.memories?.title ?? report.memory_id,
    details: {
      report_id: report.id,
      status,
      reason: report.reason,
      resolution_note: resolutionNote,
    },
  });
}

async function listReports(supabase: AdminSupabaseClient, body: Record<string, unknown>) {
  const status = typeof body.status === 'string' ? body.status : 'open';
  let query = supabase
    .from('memory_reports')
    .select(REPORT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(100);

  if (status === 'open' || status === 'resolved' || status === 'dismissed') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return response({ error: 'Unable to list reports.' }, 500);
  return response({ reports: data ?? [] }, 200);
}

async function updateReport(
  supabase: AdminSupabaseClient,
  user: any,
  body: Record<string, unknown>,
) {
  const reportId = typeof body.report_id === 'string' ? body.report_id : '';
  const status = typeof body.status === 'string' ? body.status : '';
  const resolutionNote = typeof body.resolution_note === 'string' && body.resolution_note.trim()
    ? body.resolution_note.trim().slice(0, 500)
    : null;

  if (!isUuid(reportId)) return response({ error: 'Invalid report id.' }, 400);
  if (!['open', 'resolved', 'dismissed'].includes(status)) {
    return response({ error: 'Invalid status.' }, 400);
  }

  const { data: existing, error: existingError } = await supabase
    .from('memory_reports')
    .select(REPORT_COLUMNS)
    .eq('id', reportId)
    .maybeSingle();

  if (existingError) return response({ error: 'Unable to read report.' }, 500);
  if (!existing) return response({ error: 'Report not found.' }, 404);

  const { data: report, error } = await supabase
    .from('memory_reports')
    .update({
      status,
      resolution_note: resolutionNote,
      resolved_by: status === 'open' ? null : user.id,
      resolved_at: status === 'open' ? null : new Date().toISOString(),
    })
    .eq('id', reportId)
    .select(REPORT_COLUMNS)
    .single();

  if (error) return response({ error: 'Unable to update report.' }, 500);

  await writeAuditLog(supabase, {
    actorUserId: user.id,
    actorEmail: user.email ?? null,
    report,
    status,
    resolutionNote,
  });

  return response({ report }, 200);
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
    return listReports(admin.supabase, body);
  }
  if (body.action === 'update') {
    return updateReport(admin.supabase, admin.user, body);
  }

  return response({ error: 'Unknown action.' }, 400);
});

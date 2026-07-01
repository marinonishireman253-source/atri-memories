import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const allowedReasons = new Set(['inappropriate', 'copyright', 'privacy', 'spam', 'other']);
const REPORT_BURST_LIMIT = 3;
const REPORT_BURST_WINDOW_MS = 15 * 60 * 1000;
const SAME_MEMORY_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const REPORT_CODE_DUPLICATE_OPEN = 'duplicate_open_report';
const REPORT_CODE_MEMORY_COOLDOWN = 'memory_report_cooldown';
const REPORT_CODE_RATE_LIMIT = 'report_rate_limited';
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

function parseIpAddress(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp?.trim()) return realIp.trim();
  return null;
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function buildReporterFingerprint(
  request: Request,
  user: Awaited<ReturnType<typeof getRequestUser>>,
  reporterEmail: string | null,
) {
  if (user?.id) {
    return `user:${user.id}`;
  }

  const ipAddress = parseIpAddress(request) ?? 'unknown-ip';
  const userAgent = request.headers.get('user-agent')?.trim() || 'unknown-agent';
  const normalizedEmail = reporterEmail?.trim().toLowerCase() || 'no-email';
  return `anon:${await sha256Hex([ipAddress, userAgent, normalizedEmail].join('|'))}`;
}

function isoOffset(ms: number) {
  return new Date(Date.now() - ms).toISOString();
}

function retryAfterSeconds(createdAt: string, windowMs: number) {
  const remainingMs = new Date(createdAt).getTime() + windowMs - Date.now();
  return Math.max(60, Math.ceil(remainingMs / 1000));
}

async function getRequestUser(
  supabase: AdminSupabaseClient,
  request: Request,
) {
  const authHeader = request.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return null;

  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) return null;
  return data.user;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return response({ error: 'Method not allowed.' }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return response({ error: 'Invalid request.' }, 400);
  }

  const memoryId = body.memory_id;
  const reason = typeof body.reason === 'string' ? body.reason : '';
  const note = typeof body.note === 'string' && body.note.trim()
    ? body.note.trim().slice(0, 500)
    : null;
  const reporterEmail = typeof body.reporter_email === 'string' && body.reporter_email.includes('@')
    ? body.reporter_email.trim().slice(0, 254)
    : null;

  if (!isUuid(memoryId)) return response({ error: 'Invalid memory id.' }, 400);
  if (!allowedReasons.has(reason)) return response({ error: 'Invalid reason.' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  ) as AdminSupabaseClient;
  const user = await getRequestUser(supabase, request);
  const reporterFingerprint = await buildReporterFingerprint(request, user, reporterEmail);

  const { data: memory, error: memoryError } = await supabase
    .from('memories')
    .select('id, visibility_status')
    .eq('id', memoryId)
    .maybeSingle();

  if (memoryError) return response({ error: 'Unable to read memory.' }, 500);
  if (!memory || memory.visibility_status !== 'public') {
    return response({ error: 'Memory is not reportable.' }, 404);
  }

  const [openDuplicateResult, sameMemoryRecentResult, recentReportsResult] = await Promise.all([
    supabase
      .from('memory_reports')
      .select('id')
      .eq('memory_id', memoryId)
      .eq('reporter_fingerprint', reporterFingerprint)
      .eq('status', 'open')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('memory_reports')
      .select('created_at')
      .eq('memory_id', memoryId)
      .eq('reporter_fingerprint', reporterFingerprint)
      .gte('created_at', isoOffset(SAME_MEMORY_COOLDOWN_MS))
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('memory_reports')
      .select('created_at')
      .eq('reporter_fingerprint', reporterFingerprint)
      .gte('created_at', isoOffset(REPORT_BURST_WINDOW_MS))
      .order('created_at', { ascending: true })
      .limit(REPORT_BURST_LIMIT),
  ]);

  if (openDuplicateResult.error || sameMemoryRecentResult.error || recentReportsResult.error) {
    return response({ error: 'Unable to validate report limits.' }, 500);
  }

  if (openDuplicateResult.data) {
    return response({
      error: 'Duplicate open report.',
      code: REPORT_CODE_DUPLICATE_OPEN,
    }, 409);
  }

  const latestSameMemoryReport = sameMemoryRecentResult.data?.[0];
  if (latestSameMemoryReport?.created_at) {
    return response({
      error: 'Memory report cooldown.',
      code: REPORT_CODE_MEMORY_COOLDOWN,
      retry_after_seconds: retryAfterSeconds(
        latestSameMemoryReport.created_at,
        SAME_MEMORY_COOLDOWN_MS,
      ),
    }, 429);
  }

  const recentReports = recentReportsResult.data ?? [];
  if (recentReports.length >= REPORT_BURST_LIMIT) {
    const oldestRecent = recentReports[0];
    return response({
      error: 'Report rate limit exceeded.',
      code: REPORT_CODE_RATE_LIMIT,
      retry_after_seconds: oldestRecent?.created_at
        ? retryAfterSeconds(oldestRecent.created_at, REPORT_BURST_WINDOW_MS)
        : Math.ceil(REPORT_BURST_WINDOW_MS / 1000),
    }, 429);
  }

  const { data: report, error } = await supabase
    .from('memory_reports')
    .insert({
      memory_id: memoryId,
      reporter_fingerprint: reporterFingerprint,
      reporter_user_id: user?.id ?? null,
      reporter_email: user?.email ?? reporterEmail,
      reason,
      note,
    })
    .select('id, status, created_at')
    .single();

  if (error?.code === '23505') {
    return response({
      error: 'Duplicate open report.',
      code: REPORT_CODE_DUPLICATE_OPEN,
    }, 409);
  }
  if (error) return response({ error: 'Unable to submit report.' }, 500);
  return response({ report }, 200);
});

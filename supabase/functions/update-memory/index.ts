import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type AdminSupabaseClient = any;

function response(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const item of value) {
    const tag = String(item).trim().slice(0, 24);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length >= 8) break;
  }

  return tags;
}

async function writeAuditLog(
  supabase: AdminSupabaseClient,
  {
    actorUserId,
    actorEmail,
    targetId,
    targetLabel,
    details,
  }: {
    actorUserId: string;
    actorEmail: string | null;
    targetId: string;
    targetLabel: string | null;
    details: Record<string, unknown>;
  },
) {
  await supabase.from('admin_audit_logs').insert({
    actor_user_id: actorUserId,
    actor_email: actorEmail,
    action: 'update_memory',
    target_type: 'memory',
    target_id: targetId,
    target_label: targetLabel,
    details,
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return response({ error: 'Method not allowed.' }, 405);
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) {
    return response({ error: 'Unauthorized.' }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return response({ error: 'Invalid request.' }, 400);
  }

  const id = typeof body.id === 'string' ? body.id : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const caption =
    typeof body.caption === 'string' && body.caption.trim()
      ? body.caption.trim()
      : null;
  const tags = normalizeTags(body.tags);
  const requestedFeatured =
    typeof body.is_featured === 'boolean' ? body.is_featured : undefined;
  const requestedVisibility =
    body.visibility_status === 'public' || body.visibility_status === 'hidden'
      ? body.visibility_status
      : undefined;

  if (!isUuid(id)) return response({ error: 'Invalid memory id.' }, 400);
  if (title.length < 1 || title.length > 80) {
    return response({ error: 'Title must be 1-80 characters.' }, 400);
  }
  if (caption && caption.length > 280) {
    return response({ error: 'Caption must be 280 characters or fewer.' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  ) as AdminSupabaseClient;
  const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !authData.user) return response({ error: 'Unauthorized.' }, 401);

  const { data: existing, error: existingError } = await supabase
    .from('memories')
    .select('id, title, caption, owner_id, owner_email, tags, file_size_bytes, is_featured, visibility_status')
    .eq('id', id)
    .maybeSingle();
  if (existingError) return response({ error: 'Unable to find memory.' }, 500);
  if (!existing) return response({ error: 'Memory not found.' }, 404);

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', authData.user.id)
    .maybeSingle();
  const isOwner = existing.owner_id === authData.user.id;
  const isAdmin = Boolean(adminRow);

  if (!isOwner && !isAdmin) return response({ error: 'Forbidden.' }, 403);

  const updatePayload: Record<string, unknown> = { title, caption, tags };
  if (isAdmin && typeof requestedFeatured === 'boolean') {
    updatePayload.is_featured = requestedFeatured;
  }
  if (isAdmin && requestedVisibility) {
    updatePayload.visibility_status = requestedVisibility;
    if (requestedVisibility === 'hidden') {
      updatePayload.is_featured = false;
    }
  }

  const { data: memory, error } = await supabase
    .from('memories')
    .update(updatePayload)
    .eq('id', id)
    .select('id, title, caption, image_url, storage_path, owner_id, owner_email, tags, file_size_bytes, is_featured, visibility_status, created_at')
    .single();

  if (error) return response({ error: 'Unable to update memory.' }, 500);
  await writeAuditLog(supabase, {
    actorUserId: authData.user.id,
    actorEmail: authData.user.email ?? null,
    targetId: memory.id,
    targetLabel: memory.title ?? null,
    details: {
      before: {
        title: existing.title,
        caption: existing.caption,
        tags: existing.tags ?? [],
        is_featured: existing.is_featured,
        visibility_status: existing.visibility_status,
      },
      after: {
        title: memory.title,
        caption: memory.caption,
        tags: memory.tags ?? [],
        is_featured: memory.is_featured,
        visibility_status: memory.visibility_status,
      },
      owner_id: existing.owner_id,
      owner_email: existing.owner_email,
    },
  });
  return response({ memory }, 200);
});

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type AdminSupabaseClient = any;

function thumbnailPathFor(storagePath: string) {
  const match = storagePath.match(/^public\/([^/]+)\/([^/.]+)\.[a-z0-9]+$/i);
  if (!match) return '';
  return `public/${match[1]}/thumbs/${match[2]}.webp`;
}

function response(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
    action: 'delete_memory',
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

  let id = '';
  try {
    const body = await request.json();
    id = typeof body.id === 'string' ? body.id : '';
  } catch {
    return response({ error: 'Invalid request.' }, 400);
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    return response({ error: 'Invalid memory id.' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  ) as AdminSupabaseClient;
  const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !authData.user) return response({ error: 'Unauthorized.' }, 401);

  const { data: memory, error: readError } = await supabase
    .from('memories')
    .select('id, title, caption, storage_path, owner_id, owner_email, tags, file_size_bytes, created_at')
    .eq('id', id)
    .maybeSingle();

  if (readError) return response({ error: 'Unable to find memory.' }, 500);
  if (!memory) return response({ error: 'Memory not found.' }, 404);

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', authData.user.id)
    .maybeSingle();
  const isOwner = memory.owner_id === authData.user.id;
  const isAdmin = Boolean(adminRow);

  if (!isOwner && !isAdmin) return response({ error: 'Forbidden.' }, 403);

  const { error: storageError } = await supabase.storage
    .from('atri-images')
    .remove([memory.storage_path, thumbnailPathFor(memory.storage_path)].filter(Boolean));
  if (storageError) return response({ error: 'Unable to delete image.' }, 500);

  const { error: deleteError } = await supabase
    .from('memories')
    .delete()
    .eq('id', id);
  if (deleteError) return response({ error: 'Unable to delete memory.' }, 500);

  await writeAuditLog(supabase, {
    actorUserId: authData.user.id,
    actorEmail: authData.user.email ?? null,
    targetId: memory.id,
    targetLabel: memory.title ?? null,
    details: {
      storage_path: memory.storage_path,
      thumbnail_path: thumbnailPathFor(memory.storage_path),
      owner_id: memory.owner_id,
      owner_email: memory.owner_email,
      tags: memory.tags ?? [],
      file_size_bytes: memory.file_size_bytes,
      created_at: memory.created_at,
    },
  });

  return response({ deleted: id }, 200);
});

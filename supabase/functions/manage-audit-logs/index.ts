import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function response(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
  if (!jwt) return response({ error: 'Unauthorized.' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !authData.user) return response({ error: 'Unauthorized.' }, 401);

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (!adminRow) return response({ error: 'Forbidden.' }, 403);

  const { data, error } = await supabase
    .from('admin_audit_logs')
    .select('id, actor_user_id, actor_email, action, target_type, target_id, target_label, details, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return response({ error: 'Unable to list audit logs.' }, 500);
  return response({ logs: data ?? [] }, 200);
});

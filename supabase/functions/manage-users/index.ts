import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const AUTH_USERS_PAGE_SIZE = 1000;
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

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

async function readInvitePolicy(
  supabase: AdminSupabaseClient,
  adminUserId: string,
) {
  const { data, error } = await supabase
    .rpc('admin_invite_policy_state', { check_user_id: adminUserId })
    .single();

  if (error) throw error;

  return {
    invite_hour_limit:
      typeof data?.invite_hour_limit === 'number' ? data.invite_hour_limit : null,
    invite_hour_count:
      typeof data?.invite_hour_count === 'number' ? data.invite_hour_count : 0,
    invite_day_limit:
      typeof data?.invite_day_limit === 'number' ? data.invite_day_limit : null,
    invite_day_count:
      typeof data?.invite_day_count === 'number' ? data.invite_day_count : 0,
    allows_invite: data?.allows_invite !== false,
  };
}

async function listAllAuthUsers(supabase: AdminSupabaseClient) {
  const allUsers = [];
  let page = 1;

  while (true) {
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_USERS_PAGE_SIZE,
    });
    if (usersError) throw usersError;

    allUsers.push(...(usersData.users ?? []));
    if ((usersData.users ?? []).length < AUTH_USERS_PAGE_SIZE) {
      break;
    }
    page += 1;
  }

  return allUsers;
}

async function findAuthUserByEmail(supabase: AdminSupabaseClient, email: string) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_USERS_PAGE_SIZE,
    });
    if (error) throw error;

    const user = (data.users ?? []).find(
      (candidate: any) => (candidate.email ?? '').toLowerCase() === email,
    );
    if (user) return user;
    if ((data.users ?? []).length < AUTH_USERS_PAGE_SIZE) return null;
    page += 1;
  }
}

async function listUsers(supabase: AdminSupabaseClient, adminUserId: string) {
  const allUsers = await listAllAuthUsers(supabase);

  const { data: adminRows, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id, created_at');
  if (adminError) return response({ error: 'Unable to list admins.' }, 500);

  const { data: memoryRows, error: memoryError } = await supabase
    .from('memories')
    .select('owner_id, file_size_bytes');
  if (memoryError) return response({ error: 'Unable to count uploads.' }, 500);

  const { data: profileRows, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_id, can_upload, upload_limit_total');
  if (profileError) return response({ error: 'Unable to list upload policies.' }, 500);

  const admins = new Map<string, string>(
    (adminRows ?? []).map((row: any): [string, string] => [row.user_id as string, row.created_at as string]),
  );
  const uploadCounts = new Map<string, number>();
  const storageUsage = new Map<string, number>();
  const uploadPolicies = new Map<string, { can_upload: boolean; upload_limit_total: number | null }>(
    (profileRows ?? []).map((row: any): [string, { can_upload: boolean; upload_limit_total: number | null }] => [
      row.user_id as string,
      {
        can_upload: row.can_upload !== false,
        upload_limit_total:
          typeof row.upload_limit_total === 'number' ? row.upload_limit_total : null,
      },
    ]),
  );

  for (const row of memoryRows ?? []) {
    if (!row.owner_id) continue;
    uploadCounts.set(row.owner_id, (uploadCounts.get(row.owner_id) ?? 0) + 1);
    if (typeof row.file_size_bytes === 'number') {
      storageUsage.set(row.owner_id, (storageUsage.get(row.owner_id) ?? 0) + row.file_size_bytes);
    }
  }

  const users = allUsers
    .map((user) => {
      const policy = uploadPolicies.get(user.id) ?? {
        can_upload: true,
        upload_limit_total: null,
      };
      return {
        id: user.id,
        email: user.email ?? '(no email)',
        created_at: user.created_at,
        invited_at: user.invited_at ?? null,
        email_confirmed_at: user.email_confirmed_at ?? null,
        last_sign_in_at: user.last_sign_in_at ?? null,
        is_admin: admins.has(user.id),
        admin_created_at: admins.get(user.id) ?? null,
        upload_count: uploadCounts.get(user.id) ?? 0,
        storage_used_bytes: storageUsage.get(user.id) ?? 0,
        can_upload: policy.can_upload,
        upload_limit_total: policy.upload_limit_total,
      };
    })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  let invitePolicy;
  try {
    invitePolicy = await readInvitePolicy(supabase, adminUserId);
  } catch {
    return response({ error: 'Unable to read invite policy.' }, 500);
  }

  return response({ users, invite_policy: invitePolicy }, 200);
}

async function writeAuditLog(
  supabase: AdminSupabaseClient,
  {
    actorUserId,
    actorEmail,
    action,
    targetId,
    targetLabel,
    details,
  }: {
    actorUserId: string;
    actorEmail: string | null;
    action: 'grant_admin' | 'revoke_admin' | 'update_user_upload_policy' | 'invite_user';
    targetId: string;
    targetLabel: string | null;
    details: Record<string, unknown>;
  },
) {
  await supabase.from('admin_audit_logs').insert({
    actor_user_id: actorUserId,
    actor_email: actorEmail,
    action,
    target_type: 'user',
    target_id: targetId,
    target_label: targetLabel,
    details,
  });
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
    return listUsers(admin.supabase, admin.user.id);
  }

  if (body.action === 'set-admin') {
    const userId = typeof body.user_id === 'string' ? body.user_id : '';
    const isAdmin = Boolean(body.is_admin);

    if (!isUuid(userId)) return response({ error: 'Invalid user id.' }, 400);
    if (userId === admin.user.id && !isAdmin) {
      return response({ error: 'You cannot remove your own admin role.' }, 400);
    }

    const { data: targetUserData } = await admin.supabase.auth.admin.getUserById(userId);
    const targetEmail = targetUserData?.user?.email ?? null;

    if (isAdmin) {
      const { error } = await admin.supabase
        .from('admin_users')
        .upsert({ user_id: userId }, { onConflict: 'user_id' });
      if (error) return response({ error: 'Unable to grant admin.' }, 500);
    } else {
      const { error } = await admin.supabase
        .from('admin_users')
        .delete()
        .eq('user_id', userId);
      if (error) return response({ error: 'Unable to revoke admin.' }, 500);
    }

    await writeAuditLog(admin.supabase, {
      actorUserId: admin.user.id,
      actorEmail: admin.user.email ?? null,
      action: isAdmin ? 'grant_admin' : 'revoke_admin',
      targetId: userId,
      targetLabel: targetEmail,
      details: {
        target_email: targetEmail,
      },
    });

    return response({ user_id: userId, is_admin: isAdmin }, 200);
  }

  if (body.action === 'set-upload-policy') {
    const userId = typeof body.user_id === 'string' ? body.user_id : '';
    const canUpload = body.can_upload !== false;
    const limitValue = body.upload_limit_total;
    const uploadLimitTotal =
      limitValue === null || limitValue === ''
        ? null
        : Number.isFinite(Number(limitValue))
          ? Math.max(0, Math.floor(Number(limitValue)))
          : undefined;

    if (!isUuid(userId)) return response({ error: 'Invalid user id.' }, 400);
    if (uploadLimitTotal === undefined) {
      return response({ error: 'Invalid upload limit.' }, 400);
    }

    const { data: targetUserData } = await admin.supabase.auth.admin.getUserById(userId);
    const targetEmail = targetUserData?.user?.email ?? null;

    const { error } = await admin.supabase
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          can_upload: canUpload,
          upload_limit_total: uploadLimitTotal,
        },
        { onConflict: 'user_id' },
      );

    if (error) return response({ error: 'Unable to update upload policy.' }, 500);

    await writeAuditLog(admin.supabase, {
      actorUserId: admin.user.id,
      actorEmail: admin.user.email ?? null,
      action: 'update_user_upload_policy',
      targetId: userId,
      targetLabel: targetEmail,
      details: {
        target_email: targetEmail,
        can_upload: canUpload,
        upload_limit_total: uploadLimitTotal,
      },
    });

    return response({
      user_id: userId,
      can_upload: canUpload,
      upload_limit_total: uploadLimitTotal,
    }, 200);
  }

  if (body.action === 'invite-user') {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!isEmail(email)) {
      return response({ error: 'Invalid email.', code: 'invalid_email' }, 400);
    }

    let invitePolicy;
    try {
      invitePolicy = await readInvitePolicy(admin.supabase, admin.user.id);
    } catch {
      return response({ error: 'Unable to read invite policy.' }, 500);
    }

    if (invitePolicy.allows_invite === false) {
      return response({
        error: 'Invite rate limited.',
        code: 'invite_rate_limited',
        invite_policy: invitePolicy,
      }, 429);
    }

    let existingUser = null;
    try {
      existingUser = await findAuthUserByEmail(admin.supabase, email);
    } catch {
      return response({ error: 'Unable to inspect existing users.' }, 500);
    }
    if (existingUser) {
      return response({ error: 'User already exists.', code: 'user_exists' }, 409);
    }

    const { data: invited, error } = await admin.supabase.auth.admin.inviteUserByEmail(email);
    if (error) {
      return response({ error: 'Unable to invite user.' }, 500);
    }

    await writeAuditLog(admin.supabase, {
      actorUserId: admin.user.id,
      actorEmail: admin.user.email ?? null,
      action: 'invite_user',
      targetId: invited.user?.id ?? email,
      targetLabel: email,
      details: {
        invited_email: email,
      },
    });

    try {
      invitePolicy = await readInvitePolicy(admin.supabase, admin.user.id);
    } catch {
      invitePolicy = null;
    }

    return response({
      invited: {
        id: invited.user?.id ?? null,
        email,
      },
      invite_policy: invitePolicy,
    }, 200);
  }

  return response({ error: 'Unknown action.' }, 400);
});

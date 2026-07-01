async function readOwnAdminRow({ supabase, currentUser }) {
  if (typeof supabase?.from !== 'function') return false;

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', currentUser.id)
    .maybeSingle();

  return Boolean(data && !error);
}

export async function loadCurrentAdminStatus({ supabase, currentUser }) {
  if (!supabase || !currentUser?.id) return false;

  if (typeof supabase.rpc === 'function') {
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (!error) return data === true;
    } catch {
      // Fall back to the older table-readable policy below.
    }
  }

  try {
    return await readOwnAdminRow({ supabase, currentUser });
  } catch {
    return false;
  }
}

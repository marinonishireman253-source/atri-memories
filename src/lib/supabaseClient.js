import { createClient } from '@supabase/supabase-js';

const projectUrl = import.meta.env.VITE_SUPABASE_URL;
const publicKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(projectUrl && publicKey) && import.meta.env.VITE_DEMO_MODE !== 'true';

export const supabase = hasSupabaseConfig
  ? createClient(projectUrl, publicKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

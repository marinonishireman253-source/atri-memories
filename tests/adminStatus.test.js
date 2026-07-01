import test from 'node:test';
import assert from 'node:assert/strict';

import { loadCurrentAdminStatus } from '../src/lib/adminStatus.js';

test('loads current admin status through the database admin RPC first', async () => {
  const calls = [];
  const supabase = {
    rpc: async (name) => {
      calls.push(['rpc', name]);
      return { data: true, error: null };
    },
    from: () => {
      throw new Error('admin status should not read admin_users when RPC succeeds');
    },
  };

  const isAdmin = await loadCurrentAdminStatus({
    supabase,
    currentUser: { id: 'user-1' },
  });

  assert.equal(isAdmin, true);
  assert.deepEqual(calls, [['rpc', 'is_admin']]);
});

test('falls back to the own admin_users row when the RPC is unavailable', async () => {
  const calls = [];
  const supabase = {
    rpc: async (name) => {
      calls.push(['rpc', name]);
      return { data: null, error: { code: 'PGRST202', message: 'function not found' } };
    },
    from: (table) => {
      calls.push(['from', table]);
      return {
        select: (columns) => {
          calls.push(['select', columns]);
          return {
            eq: (column, value) => {
              calls.push(['eq', column, value]);
              return {
                maybeSingle: async () => ({ data: { user_id: value }, error: null }),
              };
            },
          };
        },
      };
    },
  };

  const isAdmin = await loadCurrentAdminStatus({
    supabase,
    currentUser: { id: 'user-1' },
  });

  assert.equal(isAdmin, true);
  assert.deepEqual(calls, [
    ['rpc', 'is_admin'],
    ['from', 'admin_users'],
    ['select', 'user_id'],
    ['eq', 'user_id', 'user-1'],
  ]);
});

test('returns false without an authenticated user or backend client', async () => {
  assert.equal(await loadCurrentAdminStatus({ supabase: null, currentUser: { id: 'user-1' } }), false);
  assert.equal(await loadCurrentAdminStatus({ supabase: {}, currentUser: null }), false);
});

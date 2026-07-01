import { useCallback, useState } from 'react';
import {
  invitePolicyErrorMessage,
  normalizeInvitePolicy,
} from '../lib/adminInvitePolicy.js';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient.js';

async function readFunctionErrorPayload(error) {
  const context = error?.context;
  if (!context || typeof context.json !== 'function') return null;

  try {
    return await context.json();
  } catch {
    return null;
  }
}

export function useAdminUsers() {
  const [users, setUsers] = useState([]);
  const [invitePolicy, setInvitePolicy] = useState(
    normalizeInvitePolicy(null),
  );
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [mutatingUser, setMutatingUser] = useState('');
  const [invitingUser, setInvitingUser] = useState(false);
  const [userError, setUserError] = useState('');

  const loadUsers = useCallback(async () => {
    if (!hasSupabaseConfig) return;

    setLoadingUsers(true);
    setUserError('');

    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' },
      });
      if (error) throw error;
      setUsers(data.users ?? []);
      setInvitePolicy(normalizeInvitePolicy(data.invite_policy));
    } catch {
      setUserError('无法读取用户列表，请确认当前账号仍是管理员。');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const setAdmin = async ({ userId, isAdmin }) => {
    setMutatingUser(userId);
    setUserError('');

    try {
      const { error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'set-admin',
          user_id: userId,
          is_admin: isAdmin,
        },
      });
      if (error) throw error;
      await loadUsers();
    } catch {
      setUserError(isAdmin ? '设置管理员失败。' : '取消管理员失败。');
    } finally {
      setMutatingUser('');
    }
  };

  const setUploadPolicy = async ({ userId, canUpload, uploadLimitTotal }) => {
    setMutatingUser(userId);
    setUserError('');

    try {
      const { error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'set-upload-policy',
          user_id: userId,
          can_upload: canUpload,
          upload_limit_total: uploadLimitTotal,
        },
      });
      if (error) throw error;
      await loadUsers();
    } catch {
      setUserError('更新用户上传策略失败。');
    } finally {
      setMutatingUser('');
    }
  };

  const setUploadLimit = async ({ userId, currentLimit }) => {
    const nextValue = window.prompt(
      '设置该用户可上传的总图片数。留空表示不限，填 0 表示禁止新增上传。',
      currentLimit ?? '',
    );
    if (nextValue === null) return;
    const normalized = nextValue.trim();
    const uploadLimitTotal = normalized === '' ? null : Number(normalized);

    if (uploadLimitTotal !== null && (!Number.isFinite(uploadLimitTotal) || uploadLimitTotal < 0)) {
      setUserError('上传上限必须是 0 或正整数。');
      return;
    }

    await setUploadPolicy({
      userId,
      canUpload: true,
      uploadLimitTotal: uploadLimitTotal === null ? null : Math.floor(uploadLimitTotal),
    });
  };

  const inviteUser = async ({ email }) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('请先填写要邀请的邮箱。');
    }

    setInvitingUser(true);
    setUserError('');

    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'invite-user',
          email: normalizedEmail,
        },
      });
      if (error) {
        const payload = await readFunctionErrorPayload(error);
        throw new Error(invitePolicyErrorMessage(payload));
      }
      setInvitePolicy(normalizeInvitePolicy(data?.invite_policy));
      await loadUsers();
      return data?.invited ?? null;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('发送邀请失败，请确认该邮箱尚未注册且当前账号仍是管理员。');
    } finally {
      setInvitingUser(false);
    }
  };

  return {
    users,
    invitePolicy,
    loadingUsers,
    mutatingUser,
    invitingUser,
    userError,
    loadUsers,
    setAdmin,
    setUploadPolicy,
    setUploadLimit,
    inviteUser,
  };
}

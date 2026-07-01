function countValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function nullableLimit(value) {
  if (value === null || value === '' || typeof value === 'undefined') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

export function normalizeInvitePolicy(policy) {
  return {
    invite_hour_limit: nullableLimit(policy?.invite_hour_limit),
    invite_hour_count: countValue(policy?.invite_hour_count),
    invite_day_limit: nullableLimit(policy?.invite_day_limit),
    invite_day_count: countValue(policy?.invite_day_count),
    allows_invite: policy?.allows_invite !== false,
  };
}

export function inviteLimitSummary(policy) {
  const normalized = normalizeInvitePolicy(policy);
  const windows = [
    typeof normalized.invite_hour_limit === 'number'
      ? `每小时 ${normalized.invite_hour_limit} 封`
      : null,
    typeof normalized.invite_day_limit === 'number'
      ? `每日 ${normalized.invite_day_limit} 封`
      : null,
  ].filter(Boolean);

  return windows.length ? windows.join('，') : '当前未设置邀请发送速率限制';
}

export function inviteUsageSummary(policy) {
  const normalized = normalizeInvitePolicy(policy);
  const counts = [
    typeof normalized.invite_hour_limit === 'number'
      ? `近 1 小时 ${normalized.invite_hour_count} / ${normalized.invite_hour_limit}`
      : null,
    typeof normalized.invite_day_limit === 'number'
      ? `近 24 小时 ${normalized.invite_day_count} / ${normalized.invite_day_limit}`
      : null,
  ].filter(Boolean);

  return counts.length ? counts.join('，') : '邀请发送当前没有时间窗口限制';
}

export function invitePolicyErrorMessage(payload) {
  const code = typeof payload?.code === 'string' ? payload.code : '';
  const policy = normalizeInvitePolicy(payload?.invite_policy);

  if (code === 'invite_rate_limited') {
    const windows = [
      typeof policy.invite_hour_limit === 'number' && policy.invite_hour_count >= policy.invite_hour_limit
        ? `近 1 小时已达 ${policy.invite_hour_limit} 封`
        : null,
      typeof policy.invite_day_limit === 'number' && policy.invite_day_count >= policy.invite_day_limit
        ? `近 24 小时已达 ${policy.invite_day_limit} 封`
        : null,
    ].filter(Boolean);

    return windows.length
      ? `邀请发送过快：${windows.join('，')}。请稍后再试或调整站点设置。`
      : '邀请发送过快，请稍后再试或调整站点设置。';
  }

  if (code === 'user_exists') {
    return '该邮箱已经存在，不能再次发送邀请。';
  }

  if (code === 'invalid_email') {
    return '邮箱格式无效。';
  }

  return '发送邀请失败，请确认该邮箱尚未注册且当前账号仍是管理员。';
}

export const EMPTY_AUTH_SIGNAL_SUMMARY = {
  registrations_24h: 0,
  registrations_7d: 0,
  invites_sent_24h: 0,
  invites_sent_7d: 0,
  recent_unconfirmed_registrations_24h: 0,
  stale_unconfirmed_users: 0,
  stale_invited_pending_users: 0,
  registrations_enabled: true,
};

export const AUTH_SIGNAL_THRESHOLDS = {
  registrations24hWarning: 6,
  registrations24hCritical: 15,
  invites24hWarning: 8,
  invites24hCritical: 20,
  recentUnconfirmed24hWarning: 3,
  recentUnconfirmed24hCritical: 8,
  staleUnconfirmedUsersWarning: 5,
  staleUnconfirmedUsersCritical: 12,
  stalePendingInvitesWarning: 3,
  stalePendingInvitesCritical: 8,
};

function countValue(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function toneForCount(count, { warning, critical }) {
  if (count >= critical) return 'critical';
  if (count >= warning) return 'warning';
  return 'info';
}

export function normalizeAuthSignalSummary(summary) {
  return {
    ...EMPTY_AUTH_SIGNAL_SUMMARY,
    ...(summary ?? {}),
    registrations_24h: countValue(summary?.registrations_24h),
    registrations_7d: countValue(summary?.registrations_7d),
    invites_sent_24h: countValue(summary?.invites_sent_24h),
    invites_sent_7d: countValue(summary?.invites_sent_7d),
    recent_unconfirmed_registrations_24h: countValue(summary?.recent_unconfirmed_registrations_24h),
    stale_unconfirmed_users: countValue(summary?.stale_unconfirmed_users),
    stale_invited_pending_users: countValue(summary?.stale_invited_pending_users),
    registrations_enabled: summary?.registrations_enabled !== false,
  };
}

export function authActivitySummary(summary) {
  const normalized = normalizeAuthSignalSummary(summary);
  return `24 小时注册 ${normalized.registrations_24h} 个，邀请 ${normalized.invites_sent_24h} 个，超 72 小时待确认 ${normalized.stale_unconfirmed_users + normalized.stale_invited_pending_users} 个`;
}

export function buildAuthAnomalySignals(summary) {
  const normalized = normalizeAuthSignalSummary(summary);
  const items = [];

  if (normalized.registrations_enabled && normalized.registrations_24h > 0) {
    items.push({
      key: 'signup-pressure',
      tone: toneForCount(normalized.registrations_24h, {
        warning: AUTH_SIGNAL_THRESHOLDS.registrations24hWarning,
        critical: AUTH_SIGNAL_THRESHOLDS.registrations24hCritical,
      }),
      title: '公开注册活跃度出现峰值',
      detail: `最近 24 小时新增 ${normalized.registrations_24h} 个公开注册账号，最近 7 天累计 ${normalized.registrations_7d} 个。`,
      targetTab: 'users',
      actionLabel: '去用户管理',
    });
  }

  if (!normalized.registrations_enabled && normalized.registrations_24h > 0) {
    items.push({
      key: 'registrations-while-closed',
      tone: 'warning',
      title: '邀请制下仍有新增注册账号',
      detail: `公开注册已关闭，但最近 24 小时仍出现 ${normalized.registrations_24h} 个非邀请新账号，需要核对 Auth 配置是否与站点策略一致。`,
      targetTab: 'settings',
      actionLabel: '去站点设置',
    });
  }

  if (normalized.recent_unconfirmed_registrations_24h > 0) {
    items.push({
      key: 'recent-unconfirmed-signups',
      tone: toneForCount(normalized.recent_unconfirmed_registrations_24h, {
        warning: AUTH_SIGNAL_THRESHOLDS.recentUnconfirmed24hWarning,
        critical: AUTH_SIGNAL_THRESHOLDS.recentUnconfirmed24hCritical,
      }),
      title: '新注册用户确认率偏低',
      detail: `最近 24 小时里有 ${normalized.recent_unconfirmed_registrations_24h} 个新注册账号还没完成邮箱确认。`,
      targetTab: 'users',
      actionLabel: '去用户管理',
    });
  }

  if (normalized.invites_sent_24h > 0) {
    items.push({
      key: 'invite-burst',
      tone: toneForCount(normalized.invites_sent_24h, {
        warning: AUTH_SIGNAL_THRESHOLDS.invites24hWarning,
        critical: AUTH_SIGNAL_THRESHOLDS.invites24hCritical,
      }),
      title: '邀请发放量出现峰值',
      detail: `最近 24 小时发出 ${normalized.invites_sent_24h} 个邀请，最近 7 天累计 ${normalized.invites_sent_7d} 个。`,
      targetTab: 'users',
      actionLabel: '去用户管理',
    });
  }

  if (normalized.stale_invited_pending_users > 0) {
    items.push({
      key: 'stale-pending-invites',
      tone: toneForCount(normalized.stale_invited_pending_users, {
        warning: AUTH_SIGNAL_THRESHOLDS.stalePendingInvitesWarning,
        critical: AUTH_SIGNAL_THRESHOLDS.stalePendingInvitesCritical,
      }),
      title: '待确认邀请开始积压',
      detail: `${normalized.stale_invited_pending_users} 个邀请账号已超过 72 小时仍未完成首次确认。`,
      targetTab: 'users',
      actionLabel: '去用户管理',
    });
  }

  if (normalized.stale_unconfirmed_users > 0) {
    items.push({
      key: 'stale-unconfirmed-users',
      tone: toneForCount(normalized.stale_unconfirmed_users, {
        warning: AUTH_SIGNAL_THRESHOLDS.staleUnconfirmedUsersWarning,
        critical: AUTH_SIGNAL_THRESHOLDS.staleUnconfirmedUsersCritical,
      }),
      title: '未确认注册账号开始积压',
      detail: `${normalized.stale_unconfirmed_users} 个公开注册账号已超过 72 小时仍未确认邮箱。`,
      targetTab: 'users',
      actionLabel: '去用户管理',
    });
  }

  if (!items.length) {
    items.push({
      key: 'auth-signals-clear',
      tone: 'ok',
      title: '当前没有明显注册或邀请异常',
      detail: '最近没有出现异常注册峰值、邀请堆积或新用户确认率异常下降。',
      targetTab: 'users',
      actionLabel: '继续巡检',
    });
  }

  return items;
}

export function authSignalHeadline(signals) {
  const criticalCount = (signals ?? []).filter((item) => item.tone === 'critical').length;
  const warningCount = (signals ?? []).filter((item) => item.tone === 'warning').length;
  const infoCount = (signals ?? []).filter((item) => item.tone === 'info').length;

  if (criticalCount > 0) {
    return `${criticalCount} 个账号入口异常需要立即处理`;
  }
  if (warningCount > 0) {
    return `${warningCount} 个账号入口风险需要尽快收口`;
  }
  if (infoCount > 0) {
    return `${infoCount} 个账号入口波动需要关注`;
  }
  return '当前没有明显账号入口异常';
}

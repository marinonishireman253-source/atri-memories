import { formatMemoryBytes } from './memoryPresentation.js';
import { authActivitySummary } from './adminAuthSignals.js';

export const EMPTY_OVERVIEW_SUMMARY = {
  total_memories: 0,
  uploaded_24h: 0,
  uploaded_7d: 0,
  featured_count: 0,
  unknown_size_count: 0,
  legacy_count: 0,
  hidden_count: 0,
  open_reports_count: 0,
  resolved_reports_count: 0,
  dismissed_reports_count: 0,
  total_storage_bytes: 0,
  storage_stats_limit: 5000,
  total_users: 0,
  confirmed_users: 0,
  unconfirmed_users: 0,
  invited_pending_users: 0,
  signed_in_users: 0,
  admin_count: 0,
  active_uploader_count: 0,
  disabled_upload_users: 0,
  quota_limited_users: 0,
  uploads_enabled: true,
  registrations_enabled: true,
  registrations_24h: 0,
  registrations_7d: 0,
  invites_sent_24h: 0,
  invites_sent_7d: 0,
  recent_unconfirmed_registrations_24h: 0,
  stale_unconfirmed_users: 0,
  stale_invited_pending_users: 0,
  user_stats_limit: 1000,
};

export function normalizeOverviewSummary(summary) {
  return {
    ...EMPTY_OVERVIEW_SUMMARY,
    ...(summary ?? {}),
  };
}

export function accessModeLabel(enabled) {
  return enabled ? '公开注册' : '邀请制';
}

export function pendingItemsTotal(summary) {
  const normalized = normalizeOverviewSummary(summary);
  return (
    normalized.legacy_count +
    normalized.unknown_size_count +
    normalized.hidden_count +
    normalized.open_reports_count
  );
}

export function reportStatusTotal(summary) {
  const normalized = normalizeOverviewSummary(summary);
  return (
    normalized.open_reports_count +
    normalized.resolved_reports_count +
    normalized.dismissed_reports_count
  );
}

export function overviewMetricCards(summary) {
  const normalized = normalizeOverviewSummary(summary);

  return [
    {
      key: 'memories',
      label: '图片总数',
      value: String(normalized.total_memories),
      detail: `24 小时新增 ${normalized.uploaded_24h} 张，7 天新增 ${normalized.uploaded_7d} 张`,
    },
    {
      key: 'storage',
      label: '已知容量',
      value: formatMemoryBytes(normalized.total_storage_bytes),
      detail: `${normalized.unknown_size_count} 张大小未知，统计最近 ${normalized.storage_stats_limit} 张`,
    },
    {
      key: 'users',
      label: '用户',
      value: String(normalized.total_users),
      detail: `${normalized.confirmed_users} 已确认，${normalized.unconfirmed_users} 未确认，${normalized.invited_pending_users} 邀请待确认，${normalized.disabled_upload_users} 暂停上传`,
    },
    {
      key: 'admins',
      label: '管理员',
      value: String(normalized.admin_count),
      detail: `${normalized.active_uploader_count} 个账号已有上传记录`,
    },
    {
      key: 'featured',
      label: '精选',
      value: String(normalized.featured_count),
      detail: '首页精选图片数量',
    },
    {
      key: 'access',
      label: '接入策略',
      value: accessModeLabel(normalized.registrations_enabled),
      detail: `普通用户上传${normalized.uploads_enabled ? '已开启' : '已暂停'}，${authActivitySummary(normalized)}`,
    },
    {
      key: 'pending',
      label: '待处理',
      value: String(pendingItemsTotal(normalized)),
      detail: `${normalized.legacy_count} 张历史未归属，${normalized.unknown_size_count} 张需回填大小，${normalized.hidden_count} 张已下架，${normalized.open_reports_count} 条待处理举报，${normalized.quota_limited_users} 个账号有限额`,
    },
    {
      key: 'reports',
      label: '举报状态',
      value: String(reportStatusTotal(normalized)),
      detail: `${normalized.open_reports_count} 条待处理，${normalized.resolved_reports_count} 条已处理，${normalized.dismissed_reports_count} 条已驳回`,
    },
  ];
}

export function adminChromeSummaryItems({
  loadedCount,
  totalCount,
  selectedCount,
  stats,
}) {
  return [
    `${loadedCount} 张已加载`,
    `${totalCount} 张匹配结果`,
    `${formatMemoryBytes(stats?.total_storage_bytes)} 已知容量`,
    `${stats?.hidden_count ?? 0} 张已下架`,
    `${stats?.legacy_count ?? 0} 张历史图片`,
    `${stats?.unknown_size_count ?? 0} 张大小未知`,
    `${selectedCount} 张已选择`,
  ];
}

import { actionLabel, detailSummary } from './adminFormatters.js';

export const ADMIN_LOG_ACTION_FILTERS = [
  { value: 'all', label: '全部动作' },
  { value: 'update_memory', label: actionLabel('update_memory') },
  { value: 'delete_memory', label: actionLabel('delete_memory') },
  { value: 'resolve_report', label: actionLabel('resolve_report') },
  { value: 'grant_admin', label: actionLabel('grant_admin') },
  { value: 'revoke_admin', label: actionLabel('revoke_admin') },
  { value: 'update_user_upload_policy', label: actionLabel('update_user_upload_policy') },
  { value: 'invite_user', label: actionLabel('invite_user') },
];

function logSearchText(log) {
  return [
    log.actor_email ?? '',
    log.actor_user_id ?? '',
    actionLabel(log.action),
    log.target_type ?? '',
    log.target_label ?? '',
    log.target_id ?? '',
    detailSummary(log),
  ].join(' ').toLowerCase();
}

export function filterAdminLogs(logs, { query = '', action = 'all' } = {}) {
  const normalizedQuery = query.trim().toLowerCase();
  return logs.filter((log) =>
    (action === 'all' || log.action === action) &&
    (!normalizedQuery || logSearchText(log).includes(normalizedQuery)),
  );
}

export function buildAdminLogSummary(logs) {
  const actorCount = new Set(logs.map((log) => log.actor_user_id || log.actor_email).filter(Boolean)).size;
  const actionCounts = ADMIN_LOG_ACTION_FILTERS
    .filter((action) => action.value !== 'all')
    .map((action) => ({
      ...action,
      count: logs.filter((log) => log.action === action.value).length,
    }))
    .filter((action) => action.count > 0);

  return {
    total: logs.length,
    actorCount,
    actionCounts,
    headline: logs.length ? `最近 ${logs.length} 条操作` : '还没有操作日志',
  };
}

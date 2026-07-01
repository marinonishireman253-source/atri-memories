import { actionLabel, dateLabel, detailSummary } from './adminFormatters.js';
import { ADMIN_LOG_ACTION_FILTERS } from './adminLogsModel.js';

export function AdminLogsTab({
  logs,
  logQuery,
  onLogQueryChange,
  logAction,
  onLogActionChange,
  logSummary,
  loadingLogs,
  onRefreshLogs,
}) {
  return (
    <div className="user-admin-panel">
      <div className="admin-toolbar">
        <label className="admin-search">
          搜索日志
          <input
            type="search"
            value={logQuery}
            onChange={(event) => onLogQueryChange(event.target.value)}
            placeholder="操作者、动作、目标或详情"
            disabled={loadingLogs}
          />
        </label>
        <label className="admin-select">
          动作
          <select
            value={logAction}
            onChange={(event) => onLogActionChange(event.target.value)}
            disabled={loadingLogs}
          >
            {ADMIN_LOG_ACTION_FILTERS.map((action) => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>
        </label>
        <div className="admin-actions">
          <button className="ghost-button compact" type="button" onClick={onRefreshLogs} disabled={loadingLogs}>
            {loadingLogs ? '刷新中...' : '刷新日志'}
          </button>
        </div>
      </div>
      <div className="admin-log-summary" aria-label="操作日志摘要">
        <strong>{logSummary.headline}</strong>
        <span>操作者 {logSummary.actorCount}</span>
        {logSummary.actionCounts.map((action) => (
          <span key={action.value}>
            {action.label} {action.count}
          </span>
        ))}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table audit-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>操作者</th>
              <th>动作</th>
              <th>目标</th>
              <th>详情</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{dateLabel(log.created_at)}</td>
                <td>
                  <strong title={log.actor_email || log.actor_user_id}>
                    {log.actor_email || '未知账号'}
                  </strong>
                  <span title={log.actor_user_id}>{log.actor_user_id}</span>
                </td>
                <td>
                  <span className="user-role admin">{actionLabel(log.action)}</span>
                </td>
                <td>
                  <strong title={log.target_label || log.target_id}>
                    {log.target_label || log.target_id}
                  </strong>
                  <span>{log.target_type}</span>
                </td>
                <td>
                  <span title={detailSummary(log)}>{detailSummary(log)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="empty-state compact">
            <span aria-hidden="true">◇</span>
            <h3>还没有操作日志</h3>
            <p>编辑图片、删除图片或调整管理员后会出现在这里。</p>
          </div>
        )}
      </div>
    </div>
  );
}

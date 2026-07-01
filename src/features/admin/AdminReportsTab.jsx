import { memoryImageUrl } from '../../lib/memoryMedia.js';
import { memoryPresentationModel } from '../../lib/memoryPresentation.js';
import { reasonLabel, reportStatusLabel, reportStatusTone } from '../../lib/reporting.js';
import { dateLabel } from './adminFormatters.js';
import { ADMIN_REPORT_REASON_FILTERS } from './adminReportsModel.js';

export function AdminReportsTab({
  reportStatus,
  onReportStatusChange,
  reportQuery,
  onReportQueryChange,
  reportReason,
  onReportReasonChange,
  queueSummary,
  loadingReports,
  onRefreshReports,
  reports,
  mutatingReport,
  onOpenMemory,
  onResolveReport,
}) {
  return (
    <div className="user-admin-panel">
      <div className="admin-toolbar">
        <label className="admin-search">
          搜索举报
          <input
            type="search"
            value={reportQuery}
            onChange={(event) => onReportQueryChange(event.target.value)}
            placeholder="图片、举报者、说明或处理备注"
            disabled={loadingReports}
          />
        </label>
        <label className="admin-select">
          状态
          <select
            value={reportStatus}
            onChange={(event) => onReportStatusChange(event.target.value)}
            disabled={loadingReports}
          >
            <option value="open">待处理</option>
            <option value="resolved">已处理</option>
            <option value="dismissed">已驳回</option>
            <option value="all">全部</option>
          </select>
        </label>
        <label className="admin-select">
          原因
          <select
            value={reportReason}
            onChange={(event) => onReportReasonChange(event.target.value)}
            disabled={loadingReports}
          >
            {ADMIN_REPORT_REASON_FILTERS.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </label>
        <div className="admin-actions">
          <button
            className="ghost-button compact"
            type="button"
            onClick={onRefreshReports}
            disabled={loadingReports}
          >
            {loadingReports ? '刷新中...' : '刷新举报'}
          </button>
        </div>
      </div>
      <div className="admin-report-summary" aria-label="举报队列摘要">
        <strong>{queueSummary.headline}</strong>
        <span>匿名提交 {queueSummary.anonymousCount} 条</span>
        <span>图片缺失 {queueSummary.missingMemoryCount} 条</span>
        {queueSummary.reasonCounts.map((reason) => (
          <span key={reason.value}>
            {reason.label} {reason.count}
          </span>
        ))}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table audit-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>图片</th>
              <th>举报者</th>
              <th>原因</th>
              <th>说明</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => {
              const presentation = report.memory
                ? memoryPresentationModel(report.memory, {
                    visibilityLabels: {
                      publicLabel: '当前公开中',
                      hiddenLabel: '当前已下架',
                    },
                  })
                : null;
              return (
                <tr key={report.id}>
                  <td>{dateLabel(report.created_at)}</td>
                  <td>
                    <div className="report-memory-cell">
                      {report.memory && presentation ? (
                        <>
                          <img className="admin-thumb" src={memoryImageUrl(report.memory)} alt={presentation.alt} loading="lazy" />
                          <span>
                            <strong title={presentation.title}>{presentation.title}</strong>
                            <small>{presentation.visibilityLabel}</small>
                          </span>
                        </>
                      ) : (
                        <span>图片记录不存在</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <strong title={report.reporter_email || report.reporter_user_id || '匿名访客'}>
                      {report.reporter_email || '匿名访客'}
                    </strong>
                    <span title={report.reporter_user_id || ''}>{report.reporter_user_id || '未登录提交'}</span>
                  </td>
                  <td>{reasonLabel(report.reason)}</td>
                  <td>
                    <span title={report.note || report.resolution_note || ''}>
                      {report.note || '无补充说明'}
                    </span>
                    {report.resolution_note && <small>处理备注：{report.resolution_note}</small>}
                  </td>
                  <td>
                    <span className={`user-role ${reportStatusTone(report.status)}`}>
                      {reportStatusLabel(report.status)}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="text-button inline"
                        type="button"
                        onClick={() => report.memory && onOpenMemory(report.memory, { collection: report.memory ? [report.memory] : [] })}
                        disabled={!report.memory || mutatingReport === report.id}
                      >
                        查看图片
                      </button>
                      {report.status !== 'resolved' && (
                      <button
                        className="text-button inline"
                        type="button"
                        onClick={() => onResolveReport({ reportId: report.id, status: 'resolved' })}
                        disabled={mutatingReport === report.id}
                      >
                        {mutatingReport === report.id ? '处理中...' : '标记已处理'}
                      </button>
                    )}
                      {report.status !== 'dismissed' && (
                      <button
                        className="text-button inline danger-text"
                        type="button"
                        onClick={() => onResolveReport({ reportId: report.id, status: 'dismissed' })}
                        disabled={mutatingReport === report.id}
                      >
                        {mutatingReport === report.id ? '处理中...' : '驳回举报'}
                      </button>
                    )}
                      {report.status !== 'open' && (
                      <button
                        className="text-button inline"
                        type="button"
                        onClick={() => onResolveReport({ reportId: report.id, status: 'open' })}
                        disabled={mutatingReport === report.id}
                      >
                        {mutatingReport === report.id ? '处理中...' : '重新打开'}
                      </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {reports.length === 0 && (
          <div className="empty-state compact">
            <span aria-hidden="true">◇</span>
            <h3>没有匹配的举报记录</h3>
            <p>切换状态筛选，或等待新的举报进入后台。</p>
          </div>
        )}
      </div>
    </div>
  );
}

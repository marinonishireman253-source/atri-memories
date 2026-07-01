import { overviewMetricCards } from '../../lib/adminOverview.js';
import {
  adminDemoSummaryCards,
} from '../../lib/adminDemoSummary.js';
import {
  buildRuntimeMonitoringItems,
  runtimeMonitoringHeadline,
} from '../../lib/adminMonitoring.js';
import {
  retentionActionQueue,
  retentionHeadline,
} from '../../lib/adminRetention.js';
import { authSignalHeadline, buildAuthAnomalySignals } from '../../lib/adminAuthSignals.js';
import { buildSiteHealthChecks, healthHeadline } from '../../lib/adminHealth.js';
import {
  buildLaunchReadinessChecks,
  launchReadinessHeadline,
} from '../../lib/adminLaunchReadiness.js';
import { memoryImageUrl } from '../../lib/memoryMedia.js';
import { formatMemoryDate, memoryPresentationModel } from '../../lib/memoryPresentation.js';
import { hasAnyReports, hasOpenReports, reportSummaryLabel } from '../../lib/reporting.js';
import {
  actionLabel,
} from './adminFormatters.js';
import { AdminDisclosureSection } from './AdminDisclosureSection.jsx';

export function AdminOverviewTab({
  overview,
  overviewSummary,
  loadingOverview,
  currentOrigin,
  onRefresh,
  onOpenMemory,
  onOpenImagesTab,
  onOpenLogsTab,
  onOpenUsersTab,
  onOpenReportsTab,
  onOpenSettingsTab,
}) {
  const metricCards = overviewMetricCards(overviewSummary);
  const demoCards = adminDemoSummaryCards(overviewSummary, { currentOrigin });
  const monitoringItems = buildRuntimeMonitoringItems(overviewSummary);
  const healthChecks = buildSiteHealthChecks(overviewSummary);
  const authSignals = buildAuthAnomalySignals(overviewSummary);
  const retentionItems = retentionActionQueue(overviewSummary);
  const launchChecks = buildLaunchReadinessChecks(overviewSummary, {
    currentOrigin,
    registrationsEnabled: overviewSummary?.registrations_enabled,
  });
  const tabActions = {
    images: onOpenImagesTab,
    logs: onOpenLogsTab,
    users: onOpenUsersTab,
    reports: onOpenReportsTab,
    settings: onOpenSettingsTab,
    overview: undefined,
  };

  return (
    <div className="overview-panel">
      <div className="overview-head">
        <div>
          <h3>站点运行状态</h3>
          <p>从云端数据库、认证用户和后台日志汇总，适合先判断容量、活跃度和异常项。</p>
        </div>
        <button className="ghost-button compact" type="button" onClick={onRefresh} disabled={loadingOverview}>
          {loadingOverview ? '刷新中...' : '刷新概览'}
        </button>
      </div>
      <section className="admin-demo-summary" aria-label="运营管理路径">
        <div className="admin-demo-summary-copy">
          <span>OPERATIONS</span>
          <h3>运营管理路径</h3>
          <p>从内容运营、账号权限、治理队列和上线准备四个角度，呈现这个站点不是静态相册，而是一套可运营的小产品。</p>
        </div>
        <div className="admin-demo-summary-grid">
          {demoCards.map((card) => {
            const action = tabActions[card.targetTab];

            return (
              <article className={`admin-demo-card ${card.tone}`} key={card.key}>
                <span>{card.title}</span>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>
                {action && card.actionLabel && (
                  <button className="text-button inline" type="button" onClick={action}>
                    {card.actionLabel}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <div className="overview-grid" aria-label="站点概览指标">
        {metricCards.map((card) => (
          <article key={card.key}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.detail}</small>
          </article>
        ))}
      </div>
      <section className="overview-card health-card">
        <div className="overview-card-head">
          <h3>运行监控</h3>
          <span className="health-headline">{runtimeMonitoringHeadline(monitoringItems)}</span>
        </div>
        <div className="health-check-list">
          {monitoringItems.map((item) => (
            <div className={`health-check ${item.tone}`} key={item.key}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              {item.targetTab && tabActions[item.targetTab] && (
                <button className="text-button inline" type="button" onClick={tabActions[item.targetTab]}>
                  {item.actionLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="overview-card health-card">
        <div className="overview-card-head">
          <h3>站点健康检查</h3>
          <span className="health-headline">{healthHeadline(healthChecks)}</span>
        </div>
        <div className="health-check-list">
          {healthChecks.map((check) => (
            <div className={`health-check ${check.tone}`} key={check.key}>
              <div>
                <strong>{check.title}</strong>
                <p>{check.detail}</p>
              </div>
              {check.targetTab && tabActions[check.targetTab] && (
                <button className="text-button inline" type="button" onClick={tabActions[check.targetTab]}>
                  {check.actionLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
      <AdminDisclosureSection
        title="高级运维视图"
        summary="这里保留注册与邀请信号、上线准备、数据留存等扩展治理信息。日常先看上面的监控和健康检查，再按需展开。"
      >
        <section className="overview-card health-card nested">
          <div className="overview-card-head">
            <h3>注册与邀请信号</h3>
            <span className="health-headline">{authSignalHeadline(authSignals)}</span>
          </div>
          <div className="health-check-list">
            {authSignals.map((signal) => (
              <div className={`health-check ${signal.tone}`} key={signal.key}>
                <div>
                  <strong>{signal.title}</strong>
                  <p>{signal.detail}</p>
                </div>
                {signal.targetTab && tabActions[signal.targetTab] && (
                  <button className="text-button inline" type="button" onClick={tabActions[signal.targetTab]}>
                    {signal.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
        <section className="overview-card health-card nested">
          <div className="overview-card-head">
            <h3>上线准备</h3>
            <span className="health-headline">{launchReadinessHeadline(launchChecks)}</span>
          </div>
          <div className="health-check-list">
            {launchChecks.map((check) => (
              <div className={`health-check ${check.tone}`} key={check.key}>
                <div>
                  <strong>{check.title}</strong>
                  <p>{check.detail}</p>
                </div>
                {check.targetTab && tabActions[check.targetTab] && (
                  <button className="text-button inline" type="button" onClick={tabActions[check.targetTab]}>
                    {check.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
        <section className="overview-card health-card nested">
          <div className="overview-card-head">
            <h3>数据留存与清理</h3>
            <span className="health-headline">{retentionHeadline(retentionItems)}</span>
          </div>
          <div className="health-check-list">
            {retentionItems.map((item) => (
              <div className={`health-check ${item.tone}`} key={item.key}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                {item.targetTab && tabActions[item.targetTab] && (
                  <button className="text-button inline" type="button" onClick={tabActions[item.targetTab]}>
                    {item.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </AdminDisclosureSection>
      <div className="overview-columns">
        <section className="overview-card">
          <div className="overview-card-head">
            <h3>最近上传</h3>
            <button className="text-button inline" type="button" onClick={onOpenImagesTab}>
              去图片管理
            </button>
          </div>
          <div className="overview-list">
            {overview.recent_memories.map((memory) => {
              const presentation = memoryPresentationModel(memory, {
                dateVariant: 'compact',
                ownerFallback: '未知上传者',
              });
              return (
                <button
                  className="overview-memory"
                  type="button"
                  key={memory.id}
                  onClick={() => onOpenMemory(memory, { collection: overview.recent_memories })}
                >
                  <img src={memoryImageUrl(memory)} alt={presentation.alt} loading="lazy" />
                  <span>
                    <strong title={presentation.title}>{presentation.title}</strong>
                    <small>
                      {presentation.ownerLabel} · {presentation.dateLabel} · {presentation.sizeLabel}
                      {hasOpenReports(memory.report_summary) ? ' · 有待处理举报' : ''}
                      {!hasOpenReports(memory.report_summary) && hasAnyReports(memory.report_summary) ? ' · 有举报记录' : ''}
                    </small>
                    {hasAnyReports(memory.report_summary) && (
                      <small>{reportSummaryLabel(memory.report_summary)}</small>
                    )}
                  </span>
                </button>
              );
            })}
            {!overview.recent_memories.length && (
              <p className="overview-empty">还没有上传记录。</p>
            )}
          </div>
        </section>
        <section className="overview-card">
          <div className="overview-card-head">
            <h3>最近操作</h3>
            <button className="text-button inline" type="button" onClick={onOpenLogsTab}>
              去操作日志
            </button>
          </div>
          <div className="overview-list">
            {overview.recent_logs.map((log) => (
              <div className="overview-log" key={log.id}>
                <strong>{actionLabel(log.action)}</strong>
                <span>{log.actor_email || '未知账号'} · {log.target_label || '无目标名称'}</span>
                <small>{formatMemoryDate(log.created_at, 'compact')}</small>
              </div>
            ))}
            {!overview.recent_logs.length && (
              <p className="overview-empty">还没有后台操作记录。</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

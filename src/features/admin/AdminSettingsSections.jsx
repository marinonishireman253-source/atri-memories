import {
  abuseGaps,
  abuseGuardrails,
  abuseStrategyHeadline,
} from '../../lib/adminAbuse.js';
import {
  backupAssets,
  backupOperationalNotes,
  backupRecoveryPlan,
} from '../../lib/adminBackup.js';
import {
  retentionActionQueue,
  retentionAssets,
  retentionHeadline,
} from '../../lib/adminRetention.js';
import {
  buildRuntimeMonitoringItems,
  monitoringMetricDefinitions,
  runtimeMonitoringHeadline,
} from '../../lib/adminMonitoring.js';
import {
  buildLaunchReadinessChecks,
  launchConfigItems,
  launchReadinessHeadline,
} from '../../lib/adminLaunchReadiness.js';
import { normalizeTags } from '../../lib/tags.js';
import { buildSiteHealthChecks, healthHeadline, readinessChecks } from '../../lib/adminHealth.js';
import { AdminDisclosureSection } from './AdminDisclosureSection.jsx';

function actionForTarget(item, tabActions) {
  if (!item.targetTab) return null;
  return tabActions[item.targetTab] ?? null;
}

function HealthCheckList({ items, tabActions, empty }) {
  return (
    <div className="health-check-list compact">
      {items.map((item) => {
        const action = actionForTarget(item, tabActions);

        return (
          <div className={`health-check ${item.tone}`} key={item.key}>
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
            {action && (
              <button className="text-button inline" type="button" onClick={action}>
                {item.actionLabel}
              </button>
            )}
          </div>
        );
      })}
      {!items.length && empty}
    </div>
  );
}

export function SettingsFields({
  loadingSettings,
  savingSettings,
  settingsTagText,
  onSettingsTagTextChange,
  settingsUploadMaxMb,
  onSettingsUploadMaxMbChange,
  settingsUploadBatchMax,
  onSettingsUploadBatchMaxChange,
  settingsUploadHourLimit,
  onSettingsUploadHourLimitChange,
  settingsUploadDayLimit,
  onSettingsUploadDayLimitChange,
  settingsInviteHourLimit,
  onSettingsInviteHourLimitChange,
  settingsInviteDayLimit,
  onSettingsInviteDayLimitChange,
  settingsUploadsEnabled,
  onSettingsUploadsEnabledChange,
  settingsRegistrationsEnabled,
  onSettingsRegistrationsEnabledChange,
}) {
  const disabled = loadingSettings || savingSettings;

  return (
    <div className="settings-grid">
      <label>
        预设标签
        <textarea
          value={settingsTagText}
          onChange={(event) => onSettingsTagTextChange(event.target.value)}
          rows="3"
          disabled={disabled}
          placeholder="ATRI，背景，立绘，截图"
        />
        <span>用逗号、空格或顿号分隔，最多保留 8 个。</span>
      </label>
      <label>
        单图上传上限（MB）
        <input
          type="number"
          min="1"
          max="8"
          step="1"
          value={settingsUploadMaxMb}
          onChange={(event) => onSettingsUploadMaxMbChange(event.target.value)}
          disabled={disabled}
        />
        <span>前端会按这个值校验；Storage bucket 当前硬限制是 8 MB。</span>
      </label>
      <label>
        单次上传张数
        <input
          type="number"
          min="1"
          max="100"
          step="1"
          value={settingsUploadBatchMax}
          onChange={(event) => onSettingsUploadBatchMaxChange(event.target.value)}
          disabled={disabled}
        />
        <span>控制批量上传弹窗一次最多接收多少张图片。</span>
      </label>
      <label>
        每小时上传上限（张）
        <input
          type="number"
          min="1"
          max="1000"
          step="1"
          value={settingsUploadHourLimit}
          onChange={(event) => onSettingsUploadHourLimitChange(event.target.value)}
          disabled={disabled}
          placeholder="留空表示不限"
        />
        <span>普通用户在最近 1 小时内最多可成功上传多少张；留空表示不限制。</span>
      </label>
      <label>
        每日上传上限（张）
        <input
          type="number"
          min="1"
          max="1000"
          step="1"
          value={settingsUploadDayLimit}
          onChange={(event) => onSettingsUploadDayLimitChange(event.target.value)}
          disabled={disabled}
          placeholder="留空表示不限"
        />
        <span>普通用户在最近 24 小时内最多可成功上传多少张；管理员不受这两项站点级限制。</span>
      </label>
      <label>
        每小时邀请上限（封）
        <input
          type="number"
          min="1"
          max="1000"
          step="1"
          value={settingsInviteHourLimit}
          onChange={(event) => onSettingsInviteHourLimitChange(event.target.value)}
          disabled={disabled}
          placeholder="留空表示不限"
        />
        <span>管理员在最近 1 小时内最多可发送多少封邀请；留空表示不限制。</span>
      </label>
      <label>
        每日邀请上限（封）
        <input
          type="number"
          min="1"
          max="1000"
          step="1"
          value={settingsInviteDayLimit}
          onChange={(event) => onSettingsInviteDayLimitChange(event.target.value)}
          disabled={disabled}
          placeholder="留空表示不限"
        />
        <span>管理员在最近 24 小时内最多可发送多少封邀请；邀请发送由服务端强制校验。</span>
      </label>
      <label className="settings-checkbox">
        普通用户上传
        <span>
          <input
            type="checkbox"
            checked={settingsUploadsEnabled}
            onChange={(event) => onSettingsUploadsEnabledChange(event.target.checked)}
            disabled={disabled}
          />
          {settingsUploadsEnabled ? '允许普通用户上传' : '暂停普通用户上传'}
        </span>
        <span>关闭后普通用户无法新增图片；管理员仍可上传和维护内容。</span>
      </label>
      <label className="settings-checkbox">
        公开注册
        <span>
          <input
            type="checkbox"
            checked={settingsRegistrationsEnabled}
            onChange={(event) => onSettingsRegistrationsEnabledChange(event.target.checked)}
            disabled={disabled}
          />
          {settingsRegistrationsEnabled ? '允许访客自行注册' : '暂停公开注册'}
        </span>
        <span>关闭后登录弹窗只保留登录和找回密码；已有账号仍可登录。</span>
      </label>
    </div>
  );
}

export function SettingsTagPreview({ settingsTagText }) {
  return (
    <div className="settings-preview">
      <strong>标签预览</strong>
      <div className="tag-row">
        {normalizeTags(settingsTagText).map((tag) => (
          <span className="tag-chip static" key={tag}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SettingsLaunchReadiness({
  overviewSummary,
  currentOrigin,
  settingsRegistrationsEnabled,
  settingsUploadMaxMb,
  settingsUploadBatchMax,
  settingsUploadHourLimit,
  settingsUploadDayLimit,
  settingsInviteHourLimit,
  settingsInviteDayLimit,
  settingsUploadsEnabled,
  tabActions,
}) {
  const launchChecks = buildLaunchReadinessChecks(overviewSummary, {
    currentOrigin,
    registrationsEnabled: settingsRegistrationsEnabled,
    uploadHourLimit: settingsUploadHourLimit,
    uploadDayLimit: settingsUploadDayLimit,
    inviteHourLimit: settingsInviteHourLimit,
    inviteDayLimit: settingsInviteDayLimit,
  });
  const launchConfig = launchConfigItems(overviewSummary, {
    currentOrigin,
    registrationsEnabled: settingsRegistrationsEnabled,
    uploadMaxMb: settingsUploadMaxMb,
    uploadBatchMax: settingsUploadBatchMax,
    uploadHourLimit: settingsUploadHourLimit,
    uploadDayLimit: settingsUploadDayLimit,
    inviteHourLimit: settingsInviteHourLimit,
    inviteDayLimit: settingsInviteDayLimit,
    uploadsEnabled: settingsUploadsEnabled,
  });

  return (
    <div className="settings-preview auth-settings-preview">
      <strong>上线准备</strong>
      <p className="admin-help-text">{launchReadinessHeadline(launchChecks)}</p>
      <div className="launch-config-grid">
        {launchConfig.map((item) => (
          <article className="launch-config-card" key={item.key}>
            <span>{item.label}</span>
            <code>{item.value}</code>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
      <HealthCheckList items={launchChecks} tabActions={tabActions} />
    </div>
  );
}

export function SettingsAuthReminder({
  currentOrigin,
  settingsRegistrationsEnabled,
}) {
  return (
    <div className="settings-preview auth-settings-preview">
      <strong>Auth 配置提醒</strong>
      <p className="admin-help-text">
        当前站点策略是{settingsRegistrationsEnabled ? '公开注册' : '邀请制'}。真正上线时，Supabase Auth 后台应与这里保持一致。
      </p>
      <div className="auth-config-grid">
        <div>
          <span>推荐 Site URL</span>
          <code>{currentOrigin || '本地预览 / 待部署域名'}</code>
        </div>
        <div>
          <span>推荐 Redirect URLs</span>
          <code>{currentOrigin ? `${currentOrigin} , ${currentOrigin}/` : '部署后填写站点根地址'}</code>
        </div>
        <div>
          <span>公开注册策略</span>
          <code>{settingsRegistrationsEnabled ? '允许公开注册 + 邮箱确认' : '关闭公开注册 + 管理员邀请用户'}</code>
        </div>
        <div>
          <span>邀请邮件前提</span>
          <code>需确认 Site URL、邮件模板和跳转地址可用</code>
        </div>
      </div>
    </div>
  );
}

export function SettingsOperationsPanel({
  overviewSummary,
  currentOrigin,
  settingsRegistrationsEnabled,
  settingsUploadMaxMb,
  settingsUploadBatchMax,
  settingsUploadHourLimit,
  settingsUploadDayLimit,
  settingsInviteHourLimit,
  settingsInviteDayLimit,
  settingsUploadsEnabled,
  tabActions,
}) {
  const healthChecks = buildSiteHealthChecks(overviewSummary, { currentOrigin });
  const readinessItems = readinessChecks(healthChecks);
  const assets = backupAssets(overviewSummary, {
    currentOrigin,
    registrationsEnabled: settingsRegistrationsEnabled,
  });
  const recoveryPlan = backupRecoveryPlan(overviewSummary);
  const backupNotes = backupOperationalNotes(overviewSummary, {
    currentOrigin,
    registrationsEnabled: settingsRegistrationsEnabled,
  });
  const monitoringMetrics = monitoringMetricDefinitions(overviewSummary);
  const monitoringItems = buildRuntimeMonitoringItems(overviewSummary);
  const retentionItems = retentionActionQueue(overviewSummary);
  const retentionAssetItems = retentionAssets(overviewSummary);
  const abuseItems = abuseGuardrails(overviewSummary, {
    uploadMaxMb: settingsUploadMaxMb,
    uploadBatchMax: settingsUploadBatchMax,
    uploadHourLimit: settingsUploadHourLimit,
    uploadDayLimit: settingsUploadDayLimit,
    inviteHourLimit: settingsInviteHourLimit,
    inviteDayLimit: settingsInviteDayLimit,
    uploadsEnabled: settingsUploadsEnabled,
    registrationsEnabled: settingsRegistrationsEnabled,
  });
  const abuseRiskItems = abuseGaps(overviewSummary, {
    uploadHourLimit: settingsUploadHourLimit,
    uploadDayLimit: settingsUploadDayLimit,
    inviteHourLimit: settingsInviteHourLimit,
    inviteDayLimit: settingsInviteDayLimit,
    uploadsEnabled: settingsUploadsEnabled,
    registrationsEnabled: settingsRegistrationsEnabled,
  });

  return (
    <AdminDisclosureSection
      title="运营检查清单"
      summary="这里把上线准备、备份、监控、留存和反滥用收成一条运营检查路径，用来说明这个项目如何从图库扩展成可维护产品。"
    >
      <div className="settings-preview health-settings-preview nested" aria-label="站点健康检查">
        <strong>上线与健康检查</strong>
        <p className="admin-help-text">{healthHeadline(healthChecks)}</p>
        <HealthCheckList
          items={readinessItems}
          tabActions={tabActions}
          empty={(
            <div className="health-check ok">
              <div>
                <strong>配置层没有额外风险提示</strong>
                <p>Auth 策略、邀请流程和当前域名没有额外阻塞，可以继续推进上线前配置。</p>
              </div>
            </div>
          )}
        />
      </div>
      <div className="settings-preview backup-settings-preview nested">
        <strong>导出与备份策略</strong>
        <p className="admin-help-text">
          这一段说明真实产品最先保护哪些资产、怎么导出、出问题时按什么顺序恢复。
        </p>
        <div className="backup-asset-grid">
          {assets.map((asset) => (
            <article className="backup-asset-card" key={asset.key}>
              <span>{asset.title}</span>
              <strong>{asset.priority}</strong>
              <small>{asset.scope}</small>
              <p>{asset.detail}</p>
              <code>{asset.exportRoute}</code>
              <em>建议频率：{asset.frequency}</em>
            </article>
          ))}
        </div>
        <div className="backup-plan-grid">
          <div className="backup-plan-card">
            <strong>恢复顺序</strong>
            <ol>
              {recoveryPlan.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div className="backup-plan-card">
            <strong>当前备份注意事项</strong>
            <ul>
              {backupNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="settings-preview retention-settings-preview nested">
        <strong>运行监控口径</strong>
        <p className="admin-help-text">
          这一层固定后台日常应该盯哪些运行指标，避免以后只看“图片总数”或“用户总数”这种过粗的数字。
        </p>
        <p className="admin-help-text">{runtimeMonitoringHeadline(monitoringItems)}</p>
        <div className="retention-grid">
          {monitoringMetrics.map((metric) => (
            <article className="retention-card" key={metric.key}>
              <span>{metric.title}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </article>
          ))}
        </div>
        <HealthCheckList items={monitoringItems} tabActions={tabActions} />
      </div>
      <div className="settings-preview retention-settings-preview nested">
        <strong>数据留存与清理策略</strong>
        <p className="admin-help-text">
          这一层不直接执行删除，而是固定“哪些数据要长期保留、哪些积压要定期复核、清理前应该先看什么上下文”。这样未来做清理时不会只凭感觉删内容。
        </p>
        <p className="admin-help-text">{retentionHeadline(retentionItems)}</p>
        <div className="retention-grid">
          {retentionAssetItems.map((asset) => {
            const action = actionForTarget(asset, tabActions);

            return (
              <article className="retention-card" key={asset.key}>
                <span>{asset.title}</span>
                <strong>{asset.retentionWindow}</strong>
                <small>建议复核频率：{asset.reviewCadence}</small>
                <p>{asset.detail}</p>
                <em>{asset.whyItMatters}</em>
                {action && (
                  <button className="text-button inline" type="button" onClick={action}>
                    {asset.actionLabel}
                  </button>
                )}
              </article>
            );
          })}
        </div>
        <HealthCheckList items={retentionItems} tabActions={tabActions} />
      </div>
      <div className="settings-preview abuse-settings-preview nested">
        <strong>反滥用与频率限制口径</strong>
        <p className="admin-help-text">{abuseStrategyHeadline(abuseRiskItems)}</p>
        <div className="backup-plan-grid">
          <div className="backup-plan-card">
            <strong>当前已落地的保护层</strong>
            <HealthCheckList items={abuseItems} tabActions={tabActions} />
          </div>
          <div className="backup-plan-card">
            <strong>当前缺口与下一步</strong>
            <HealthCheckList items={abuseRiskItems} tabActions={tabActions} />
          </div>
        </div>
      </div>
    </AdminDisclosureSection>
  );
}

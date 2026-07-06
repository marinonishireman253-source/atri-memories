import { normalizeOverviewSummary } from './adminOverview.js';
import { buildAuthAnomalySignals } from './adminAuthSignals.js';

export const HEALTH_TONE_CRITICAL = 'critical';
export const HEALTH_TONE_WARNING = 'warning';
export const HEALTH_TONE_INFO = 'info';
export const HEALTH_TONE_OK = 'ok';

function localOrigin(currentOrigin) {
  if (!currentOrigin) return true;
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(currentOrigin);
}

export function buildSiteHealthChecks(summary, { currentOrigin = '' } = {}) {
  const normalized = normalizeOverviewSummary(summary);
  const checks = [];

  if (normalized.open_reports_count > 0) {
    checks.push({
      key: 'open-reports',
      tone: HEALTH_TONE_CRITICAL,
      title: '存在待处理举报',
      detail: `${normalized.open_reports_count} 条举报仍未处理，公开画廊的治理压力已经落到当前站点上。`,
      targetTab: 'reports',
      actionLabel: '去举报处理',
      group: 'runtime',
    });
  }

  if (normalized.legacy_count > 0) {
    checks.push({
      key: 'legacy-memories',
      tone: HEALTH_TONE_WARNING,
      title: '仍有历史未归属图片',
      detail: `${normalized.legacy_count} 张图片没有 owner，普通用户无法自行维护这部分内容。`,
      targetTab: 'images',
      actionLabel: '去图片管理',
      group: 'runtime',
    });
  }

  if (normalized.unknown_size_count > 0) {
    checks.push({
      key: 'unknown-sizes',
      tone: HEALTH_TONE_WARNING,
      title: '容量统计仍有盲区',
      detail: `${normalized.unknown_size_count} 张图片还没有大小数据，当前容量判断不是完整账面。`,
      targetTab: 'images',
      actionLabel: '去图片管理',
      group: 'runtime',
    });
  }

  if (normalized.unconfirmed_users > 0) {
    checks.push({
      key: 'unconfirmed-users',
      tone: HEALTH_TONE_INFO,
      title: '存在未确认邮箱用户',
      detail: `${normalized.unconfirmed_users} 个账号还没有完成邮箱确认，后续邀请和找回流程可能会出现支持成本。`,
      targetTab: 'users',
      actionLabel: '去用户管理',
      group: 'runtime',
    });
  }

  if (normalized.invited_pending_users > 0) {
    checks.push({
      key: 'pending-invites',
      tone: HEALTH_TONE_INFO,
      title: '存在待完成邀请',
      detail: `${normalized.invited_pending_users} 个邀请中的账号还没有完成首次确认。`,
      targetTab: 'users',
      actionLabel: '去用户管理',
      group: 'runtime',
    });
  }

  if (!normalized.uploads_enabled) {
    checks.push({
      key: 'uploads-paused',
      tone: HEALTH_TONE_INFO,
      title: '普通用户上传已暂停',
      detail: '当前站点关闭了普通用户上传。若这不是临时运营策略，应在设置里明确记录原因。',
      targetTab: 'settings',
      actionLabel: '去站点设置',
      group: 'policy',
    });
  }

  if (!normalized.registrations_enabled) {
    checks.push({
      key: 'registrations-disabled',
      tone: HEALTH_TONE_INFO,
      title: '站点当前使用邀请制',
      detail: '公开注册已关闭，后续发号完全依赖管理员邀请流程和邮件配置。',
      targetTab: 'settings',
      actionLabel: '去站点设置',
      group: 'policy',
    });
  }

  if (localOrigin(currentOrigin)) {
    checks.push({
      key: 'local-origin',
      tone: HEALTH_TONE_WARNING,
      title: '站点仍处于本地或未部署域名',
      detail: '登录入口、分享链接和邀请邮件跳转仍然依赖当前本地地址，离真正上线还有一步。',
      targetTab: 'settings',
      actionLabel: '去站点设置',
      group: 'readiness',
    });
  }

  for (const signal of buildAuthAnomalySignals(normalized)) {
    if (signal.tone === HEALTH_TONE_OK) continue;
    checks.push({
      ...signal,
      group: 'runtime',
    });
  }

  if (!checks.length) {
    checks.push({
      key: 'healthy',
      tone: HEALTH_TONE_OK,
      title: '当前没有明显健康警报',
      detail: '概览数据没有发现待处理举报、历史图片或容量统计盲区。可以继续推进上线前准备。',
      targetTab: 'overview',
      actionLabel: '保持巡检',
      group: 'runtime',
    });
  }

  return checks;
}

export function healthSummary(checks) {
  const counts = {
    critical: 0,
    warning: 0,
    info: 0,
    ok: 0,
  };

  for (const check of checks ?? []) {
    if (check.tone === HEALTH_TONE_CRITICAL) counts.critical += 1;
    if (check.tone === HEALTH_TONE_WARNING) counts.warning += 1;
    if (check.tone === HEALTH_TONE_INFO) counts.info += 1;
    if (check.tone === HEALTH_TONE_OK) counts.ok += 1;
  }

  return counts;
}

export function healthHeadline(checks) {
  const counts = healthSummary(checks);

  if (counts.critical > 0) {
    return `${counts.critical} 个高优先级问题需要立即处理`;
  }
  if (counts.warning > 0) {
    return `${counts.warning} 个运行风险需要尽快收口`;
  }
  if (counts.info > 0) {
    return `${counts.info} 个策略或上线前提醒待确认`;
  }
  return '当前没有明显健康风险';
}

export function readinessChecks(checks) {
  return (checks ?? []).filter((check) => check.group === 'policy' || check.group === 'readiness');
}

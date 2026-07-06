import { accessModeLabel, normalizeOverviewSummary } from './adminOverview.js';
import { sharePreviewStrategy } from './routes.js';

export const READINESS_TONE_CRITICAL = 'critical';
export const READINESS_TONE_WARNING = 'warning';
export const READINESS_TONE_INFO = 'info';
export const READINESS_TONE_OK = 'ok';

function localOrigin(currentOrigin) {
  if (!currentOrigin) return true;
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(currentOrigin);
}

function displayOrigin(currentOrigin) {
  return currentOrigin || '<生产域名>';
}

function redirectOrigins(currentOrigin) {
  const origin = displayOrigin(currentOrigin);
  if (!currentOrigin) return `${origin} , ${origin}/`;
  return `${currentOrigin} , ${currentOrigin}/`;
}

function numericLimit(value, fallback = '未设置') {
  if (value === '' || value === null || value === undefined) return fallback;
  return String(value);
}

export function launchConfigItems(summary, {
  currentOrigin = '',
  registrationsEnabled = true,
  uploadMaxMb = '',
  uploadBatchMax = '',
  uploadHourLimit = '',
  uploadDayLimit = '',
  inviteHourLimit = '',
  inviteDayLimit = '',
  uploadsEnabled = true,
} = {}) {
  const normalized = normalizeOverviewSummary(summary);
  const previewStrategy = sharePreviewStrategy();
  const sharePreviewValue = previewStrategy.usingPreviewLinks
    ? '分享预览页已启用'
    : '当前使用主站图片页';
  const sharePreviewDetail = previewStrategy.usingPreviewLinks
    ? '复制分享时会优先给出独立预览页；上线前继续确认点击后能回到当前站点。'
    : '复制分享时会打开主站图片页；如果后续需要更强的社交预览，再切换为独立预览页。';

  return [
    {
      key: 'site-url',
      label: '站点入口地址',
      value: displayOrigin(currentOrigin),
      detail: localOrigin(currentOrigin)
        ? '当前仍是本地预览地址；真正上线前应替换成生产域名。'
        : '当前窗口已经是线上域名，可作为登录和分享入口继续核对。',
    },
    {
      key: 'redirect-urls',
      label: '登录跳转地址',
      value: redirectOrigins(currentOrigin),
      detail: '登录、注册和找回密码完成后，应回到当前站点地址。',
    },
    {
      key: 'signup-mode',
      label: '账号发放方式',
      value: accessModeLabel(registrationsEnabled),
      detail: registrationsEnabled
        ? '公开注册开启时，应继续保留邮箱确认。'
        : `邀请制已启用，当前有 ${normalized.invited_pending_users} 个邀请待确认。`,
    },
    {
      key: 'upload-policy',
      label: '上传策略',
      value: `${uploadsEnabled ? '普通用户上传开启' : '普通用户上传暂停'} / 单图 ${numericLimit(uploadMaxMb, '未设置')} MB / 单次 ${numericLimit(uploadBatchMax, '未设置')} 张`,
      detail: `时间窗口：每小时 ${numericLimit(uploadHourLimit, '不限')} 张，每日 ${numericLimit(uploadDayLimit, '不限')} 张。`,
    },
    {
      key: 'invite-policy',
      label: '邀请策略',
      value: `每小时 ${numericLimit(inviteHourLimit, '不限')} 封 / 每日 ${numericLimit(inviteDayLimit, '不限')} 封`,
      detail: registrationsEnabled
        ? '公开注册开启时，这组限制主要用于管理员手工发号。'
        : '关闭公开注册后，这组限制会直接影响管理员发号能力。',
    },
    {
      key: 'share-preview',
      label: '分享预览方案',
      value: sharePreviewValue,
      detail: sharePreviewDetail,
    },
  ];
}

export function buildLaunchReadinessChecks(summary, {
  currentOrigin = '',
  registrationsEnabled = true,
  uploadHourLimit = '',
  uploadDayLimit = '',
  inviteHourLimit = '',
  inviteDayLimit = '',
} = {}) {
  const normalized = normalizeOverviewSummary(summary);
  const checks = [];
  const isLocal = localOrigin(currentOrigin);
  const missingInviteWindows = !inviteHourLimit || !inviteDayLimit;
  const previewStrategy = sharePreviewStrategy();

  if (isLocal) {
    checks.push({
      key: 'domain',
      tone: READINESS_TONE_WARNING,
      title: '生产域名与登录跳转还没有真实落点',
      detail: `当前站点来源仍是 ${displayOrigin(currentOrigin)}，上线前必须把登录、注册和邀请跳转一起对齐到生产域名。`,
      targetTab: 'settings',
      actionLabel: '核对站点设置',
    });
  } else {
    checks.push({
      key: 'domain',
      tone: READINESS_TONE_OK,
      title: '当前窗口已具备生产域名候选值',
      detail: `当前来源是 ${currentOrigin}，可以继续核对登录跳转和分享域名，而不是停留在本地地址。`,
      targetTab: 'settings',
      actionLabel: '继续核对配置',
    });
  }

  if (!registrationsEnabled && missingInviteWindows) {
    checks.push({
      key: 'invite-windows',
      tone: READINESS_TONE_WARNING,
      title: '邀请制已启用，但邀请时间窗口限制还不完整',
      detail: '关闭公开注册后，管理员发号会成为唯一入口；建议同时配置每小时和每日邀请上限，避免上线后临时补风控。',
      targetTab: 'settings',
      actionLabel: '补邀请策略',
    });
  } else {
    checks.push({
      key: 'signup-flow',
      tone: READINESS_TONE_INFO,
      title: '账号发放路径已明确',
      detail: registrationsEnabled
        ? '当前走公开注册 + 邮箱确认；上线前继续核对邮件内容和登录跳转地址。'
        : `当前走邀请制，邀请频率限制已经存在；仍有 ${normalized.invited_pending_users} 个邀请待确认。`,
      targetTab: 'users',
      actionLabel: '看用户状态',
    });
  }

  if (normalized.unknown_size_count > 0) {
    checks.push({
      key: 'storage-audit',
      tone: READINESS_TONE_WARNING,
      title: '容量统计还没有完全可用',
      detail: `${normalized.unknown_size_count} 张图片仍缺少大小数据。上线前最好先做一次回填，避免监控口径带盲区。`,
      targetTab: 'images',
      actionLabel: '去图片管理',
    });
  } else {
    checks.push({
      key: 'storage-audit',
      tone: READINESS_TONE_OK,
      title: '图片容量账面已可用',
      detail: '当前没有大小未知图片，Storage 用量和图片容量判断已经具备上线前巡检基础。',
      targetTab: 'images',
      actionLabel: '继续巡检图片',
    });
  }

  if (normalized.open_reports_count > 0) {
    checks.push({
      key: 'content-governance',
      tone: READINESS_TONE_CRITICAL,
      title: '仍有待处理举报，不适合直接公开上线',
      detail: `${normalized.open_reports_count} 条举报还在待处理状态。上线前应先把内容治理积压清掉。`,
      targetTab: 'reports',
      actionLabel: '去举报处理',
    });
  } else {
    checks.push({
      key: 'content-governance',
      tone: READINESS_TONE_OK,
      title: '当前没有待处理举报积压',
      detail: '内容治理层暂时没有阻断性问题，适合继续推进部署配置和回归验收。',
      targetTab: 'reports',
      actionLabel: '继续巡检举报',
    });
  }

  checks.push({
    key: 'share-preview',
    tone: previewStrategy.usingPreviewLinks ? READINESS_TONE_INFO : READINESS_TONE_WARNING,
    title: previewStrategy.usingPreviewLinks
      ? '分享预览复制策略已启用'
      : '分享预览仍使用主站图片页',
    detail: previewStrategy.usingPreviewLinks
      ? '分享入口会打开独立预览页；上线前继续确认链接能正常打开并回到当前站点。'
      : '当前分享入口仍打开主站图片页；后续如需更醒目的社交预览，可以在发布前切换。',
    targetTab: 'settings',
    actionLabel: previewStrategy.usingPreviewLinks ? '继续核对配置' : '核对分享策略',
  });

  checks.push({
    key: 'manual-qa',
    tone: READINESS_TONE_INFO,
    title: '上线前仍需要一次完整手工验收',
    detail: `除了自动检查，还要按清单手工走访客、用户、管理员和手机端主流程。当前上传时间窗口是每小时 ${numericLimit(uploadHourLimit, '不限')} 张 / 每日 ${numericLimit(uploadDayLimit, '不限')} 张。`,
    targetTab: 'overview',
    actionLabel: '回到运维概览',
  });

  return checks;
}

export function launchReadinessHeadline(checks) {
  const counts = {
    critical: 0,
    warning: 0,
    info: 0,
    ok: 0,
  };

  for (const check of checks ?? []) {
    if (check.tone === READINESS_TONE_CRITICAL) counts.critical += 1;
    if (check.tone === READINESS_TONE_WARNING) counts.warning += 1;
    if (check.tone === READINESS_TONE_INFO) counts.info += 1;
    if (check.tone === READINESS_TONE_OK) counts.ok += 1;
  }

  if (counts.critical > 0) return `${counts.critical} 个上线阻断项需要先处理`;
  if (counts.warning > 0) return `${counts.warning} 个上线准备项还没有收口`;
  if (counts.info > 0) return `${counts.info} 个上线前动作待执行`;
  return '当前没有明显的上线前阻断项';
}

import { normalizeOverviewSummary } from './adminOverview.js';
import {
  authActivitySummary,
  buildAuthAnomalySignals,
} from './adminAuthSignals.js';

function numericLimit(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

export function abuseGuardrails(summary, settings) {
  const normalized = normalizeOverviewSummary(summary);
  const {
    uploadMaxMb = 8,
    uploadBatchMax = 30,
    uploadHourLimit: rawUploadHourLimit = null,
    uploadDayLimit: rawUploadDayLimit = null,
    inviteHourLimit: rawInviteHourLimit = null,
    inviteDayLimit: rawInviteDayLimit = null,
    uploadsEnabled = true,
    registrationsEnabled = true,
  } = settings ?? {};
  const uploadHourLimit = numericLimit(rawUploadHourLimit);
  const uploadDayLimit = numericLimit(rawUploadDayLimit);
  const inviteHourLimit = numericLimit(rawInviteHourLimit);
  const inviteDayLimit = numericLimit(rawInviteDayLimit);
  const uploadRateLabels = [
    typeof uploadHourLimit === 'number' ? `每小时 ${uploadHourLimit} 张` : null,
    typeof uploadDayLimit === 'number' ? `每日 ${uploadDayLimit} 张` : null,
  ].filter(Boolean);
  const inviteRateLabels = [
    typeof inviteHourLimit === 'number' ? `每小时 ${inviteHourLimit} 封` : null,
    typeof inviteDayLimit === 'number' ? `每日 ${inviteDayLimit} 封` : null,
  ].filter(Boolean);

  const items = [
    {
      key: 'upload-auth',
      title: '上传入口受账号权限约束',
      tone: 'ok',
      detail: `普通上传要求登录账号，当前全站上传${uploadsEnabled ? '开启' : '关闭'}，并且可按用户暂停上传或设置总上传上限。`,
      actionLabel: '去用户管理',
      targetTab: 'users',
    },
    {
      key: 'upload-size',
      title: '上传体积与批次已有限制',
      tone: 'ok',
      detail: `单图上限 ${uploadMaxMb} MB，单次批量最多 ${uploadBatchMax} 张，Storage bucket 仍是 private。`,
      actionLabel: '去站点设置',
      targetTab: 'settings',
    },
    {
      key: 'auth-entry',
      title: '账号入口可切换为邀请制',
      tone: registrationsEnabled ? 'info' : 'ok',
      detail: registrationsEnabled
        ? '当前允许公开注册，后续若出现滥用账号注册压力，可切到邀请制并配合邮箱确认。'
        : `当前已关闭公开注册，${normalized.invited_pending_users} 个邀请待确认账号仍在流程中。`,
      actionLabel: '去站点设置',
      targetTab: 'settings',
    },
    {
      key: 'auth-signals',
      title: '注册与邀请异常信号已接入概览',
      tone: 'ok',
      detail: `${authActivitySummary(normalized)}；账号入口异常会直接进入运维概览和健康检查。`,
      actionLabel: '去运维概览',
      targetTab: 'overview',
    },
    {
      key: 'report-input',
      title: '举报提交通道已有基础风控',
      tone: 'ok',
      detail: '只允许举报公开图片，举报原因受固定枚举限制，备注长度有上限，同图重复待处理举报会被抑制，短时间连续提交也会被限频。',
      actionLabel: '去举报处理',
      targetTab: 'reports',
    },
  ];

  if (uploadRateLabels.length > 0) {
    items.push({
      key: 'upload-rate',
      title: '上传时间窗口限速已启用',
      tone: 'ok',
      detail: `普通用户当前按 ${uploadRateLabels.join('，')} 进行服务端限速；管理员不受这组站点级时间窗口限制。`,
      actionLabel: '去站点设置',
      targetTab: 'settings',
    });
  }

  if (inviteRateLabels.length > 0) {
    items.push({
      key: 'invite-rate',
      title: '邀请发送时间窗口限速已启用',
      tone: 'ok',
      detail: `管理员邀请当前按 ${inviteRateLabels.join('，')} 进行服务端限速，超过阈值时会直接阻止继续发信。`,
      actionLabel: '去站点设置',
      targetTab: 'settings',
    });
  }

  return items;
}

export function abuseGaps(summary, settings) {
  const normalized = normalizeOverviewSummary(summary);
  const authSignals = buildAuthAnomalySignals(normalized).filter((item) => item.tone !== 'ok');
  const {
    uploadHourLimit: rawUploadHourLimit = null,
    uploadDayLimit: rawUploadDayLimit = null,
    inviteHourLimit: rawInviteHourLimit = null,
    inviteDayLimit: rawInviteDayLimit = null,
    registrationsEnabled = true,
    uploadsEnabled = true,
  } = settings ?? {};
  const uploadHourLimit = numericLimit(rawUploadHourLimit);
  const uploadDayLimit = numericLimit(rawUploadDayLimit);
  const inviteHourLimit = numericLimit(rawInviteHourLimit);
  const inviteDayLimit = numericLimit(rawInviteDayLimit);
  const missingWindows = [
    typeof uploadHourLimit === 'number' ? null : '每小时',
    typeof uploadDayLimit === 'number' ? null : '每日',
  ].filter(Boolean);
  const missingInviteWindows = [
    typeof inviteHourLimit === 'number' ? null : '每小时',
    typeof inviteDayLimit === 'number' ? null : '每日',
  ].filter(Boolean);

  const gaps = [
    {
      key: 'signup-abuse',
      title: '注册入口仍缺少强制人机校验',
      tone: registrationsEnabled ? 'warning' : 'info',
      detail: registrationsEnabled
        ? '当前公开注册已经有异常监测，但仍缺少验证码、来源限制或 IP 级节流这类更硬的入口防护。'
        : missingInviteWindows.length > 0
          ? `当前已使用邀请制，但邀请发送仍缺少${missingInviteWindows.join(' / ')}服务端频率硬限制；当前待确认邀请 ${normalized.invited_pending_users} 个。`
          : `当前已使用邀请制，邀请发送已经有服务端时间窗口限制；当前待确认邀请 ${normalized.invited_pending_users} 个。`,
      actionLabel: registrationsEnabled ? '去站点设置' : '去用户管理',
      targetTab: registrationsEnabled ? 'settings' : 'users',
    },
  ];

  if (authSignals.length > 0) {
    gaps.push({
      key: 'auth-signal-pressure',
      title: '账号入口已经出现异常波动',
      tone: authSignals.some((item) => item.tone === 'critical') ? 'critical' : 'warning',
      detail: authSignals
        .map((item) => item.title)
        .slice(0, 3)
        .join('；'),
      actionLabel: '去运维概览',
      targetTab: 'overview',
    });
  }

  if (missingWindows.length > 0) {
    gaps.unshift({
      key: 'upload-rate',
      title: missingWindows.length === 2
        ? '上传只有总量限制，没有时间窗口限制'
        : '上传时间窗口限制还不完整',
      tone: uploadsEnabled ? 'warning' : 'info',
      detail: uploadsEnabled
        ? `当前账号可被限制总上传数，但${missingWindows.join(' / ')}上传张数仍未配置。`
        : `虽然当前普通用户上传已关闭，但后续重新开放时仍缺少${missingWindows.join(' / ')}上传速率限制。`,
      actionLabel: '去站点设置',
      targetTab: 'settings',
    });
  }

  if (missingInviteWindows.length > 0) {
    gaps.unshift({
      key: 'invite-rate',
      title: missingInviteWindows.length === 2
        ? '邀请发送还没有时间窗口限制'
        : '邀请发送时间窗口限制还不完整',
      tone: registrationsEnabled ? 'info' : 'warning',
      detail: registrationsEnabled
        ? `虽然当前允许公开注册，但管理员邀请入口仍缺少${missingInviteWindows.join(' / ')}发送速率限制。`
        : `当前账号发放依赖邀请制，但${missingInviteWindows.join(' / ')}邀请发送上限仍未配置。`,
      actionLabel: '去站点设置',
      targetTab: 'settings',
    });
  }

  if (normalized.open_reports_count > 0) {
    gaps.push({
      key: 'open-report-pressure',
      title: '当前已有治理压力',
      tone: 'critical',
      detail: `${normalized.open_reports_count} 条待处理举报说明内容治理已经有积压，频率限制和重复举报抑制会直接影响运营负担。`,
      actionLabel: '去举报处理',
      targetTab: 'reports',
    });
  }

  return gaps;
}

export function abuseStrategyHeadline(gaps) {
  const criticalCount = (gaps ?? []).filter((item) => item.tone === 'critical').length;
  const warningCount = (gaps ?? []).filter((item) => item.tone === 'warning').length;

  if (criticalCount > 0) {
    return `${criticalCount} 个高风险滥用缺口正在影响当前治理`;
  }
  if (warningCount > 0) {
    return `${warningCount} 个反滥用缺口仍未落到服务端策略`;
  }
  return '当前反滥用策略没有明显缺口';
}

import { formatMemoryBytes } from './memoryPresentation.js';
import { normalizeOverviewSummary } from './adminOverview.js';

const TONE_CRITICAL = 'critical';
const TONE_WARNING = 'warning';
const TONE_INFO = 'info';
const TONE_OK = 'ok';

function perDayAverage(total, days) {
  if (!days) return 0;
  return total / days;
}

export function monitoringMetricDefinitions(summary) {
  const normalized = normalizeOverviewSummary(summary);
  const averageUploads7d = perDayAverage(normalized.uploaded_7d, 7);

  return [
    {
      key: 'content-throughput',
      title: '内容流入',
      value: `24h ${normalized.uploaded_24h} / 7d ${normalized.uploaded_7d}`,
      detail: `平均每天约 ${averageUploads7d.toFixed(1)} 张上传，用来观察公开画廊是否还有持续流入。`,
    },
    {
      key: 'account-activity',
      title: '账号活跃',
      value: `${normalized.signed_in_users} 登录 / ${normalized.active_uploader_count} 上传者`,
      detail: '区分“有人登录”与“真的有人持续上传内容”，避免只看用户总数误判活跃度。',
    },
    {
      key: 'entry-pressure',
      title: '入口压力',
      value: `注册 24h ${normalized.registrations_24h} / 邀请 24h ${normalized.invites_sent_24h}`,
      detail: '用来观察当前账号发放方式下，注册与邀请是否出现异常峰值或完全停滞。',
    },
    {
      key: 'governance-load',
      title: '治理负载',
      value: `${normalized.open_reports_count} 待处理举报 / ${normalized.hidden_count} 已下架`,
      detail: '把治理队列和已下架内容并列看，避免只看举报数量却忽略长期积压的隐藏内容。',
    },
    {
      key: 'storage-book',
      title: '容量账面',
      value: `${formatMemoryBytes(normalized.total_storage_bytes)} 已知`,
      detail: `${normalized.unknown_size_count} 张大小未知、${normalized.legacy_count} 张历史未归属；容量数字只有在账面完整时才可靠。`,
    },
  ];
}

export function buildRuntimeMonitoringItems(summary) {
  const normalized = normalizeOverviewSummary(summary);
  const items = [];
  const averageUploads7d = perDayAverage(normalized.uploaded_7d, 7);

  if (normalized.uploaded_7d === 0) {
    items.push({
      key: 'monitor-no-content-flow',
      tone: TONE_WARNING,
      title: '最近 7 天没有新内容流入',
      detail: '公开站仍可浏览，但上传和内容运营已经停滞。需要确认这是预期休眠，还是上传链路出了问题。',
      targetTab: 'overview',
      actionLabel: '继续查看概览',
    });
  } else if (normalized.uploaded_24h >= Math.max(12, averageUploads7d * 2.5)) {
    items.push({
      key: 'monitor-upload-spike',
      tone: TONE_INFO,
      title: '最近 24 小时上传明显高于 7 天均值',
      detail: `24 小时上传 ${normalized.uploaded_24h} 张，近 7 天日均约 ${averageUploads7d.toFixed(1)} 张。需要判断是正常活动高峰，还是异常灌入。`,
      targetTab: 'images',
      actionLabel: '去图片管理',
    });
  }

  if (normalized.signed_in_users === 0 && normalized.total_users > 0) {
    items.push({
      key: 'monitor-no-signins',
      tone: TONE_WARNING,
      title: '已有账号但近期没有登录痕迹',
      detail: `${normalized.total_users} 个账号中，当前统计窗口内没有账号留下登录活跃信号。需要确认邮件确认、登录流程和入口策略是否阻塞了用户。`,
      targetTab: 'users',
      actionLabel: '去用户管理',
    });
  }

  if (normalized.active_uploader_count === 0 && normalized.total_memories > 0) {
    items.push({
      key: 'monitor-no-active-uploaders',
      tone: TONE_INFO,
      title: '当前没有活跃上传者',
      detail: '站点已有内容，但最近统计窗口里没有活跃上传账号。若目标是持续更新，应关注邀请、上传策略或用户留存。',
      targetTab: 'users',
      actionLabel: '去用户管理',
    });
  }

  if (normalized.registrations_24h === 0 && normalized.invites_sent_24h === 0 && normalized.total_users > 0) {
    items.push({
      key: 'monitor-no-entry-activity',
      tone: TONE_INFO,
      title: '最近 24 小时没有新增账号入口活动',
      detail: '注册和邀请都为 0。若当前阶段仍在扩充用户，这说明账号入口没有持续动作。',
      targetTab: 'settings',
      actionLabel: '去站点设置',
    });
  }

  if (normalized.open_reports_count > 0 || normalized.hidden_count > 0) {
    items.push({
      key: 'monitor-governance-load',
      tone: normalized.open_reports_count > 0 ? TONE_WARNING : TONE_INFO,
      title: '治理负载仍在运行中',
      detail: `${normalized.open_reports_count} 条待处理举报、${normalized.hidden_count} 张已下架图片。应和公开活跃度一起看，避免治理队列长期堆积。`,
      targetTab: 'reports',
      actionLabel: '去举报处理',
    });
  }

  if (normalized.unknown_size_count > 0 || normalized.legacy_count > 0) {
    items.push({
      key: 'monitor-bookkeeping-gap',
      tone: TONE_WARNING,
      title: '运行账面仍然不完整',
      detail: `${normalized.unknown_size_count} 张大小未知、${normalized.legacy_count} 张历史未归属。没有完整账面时，容量、活跃上传者和清理决策都不够可靠。`,
      targetTab: 'images',
      actionLabel: '去图片管理',
    });
  }

  if (!items.length) {
    items.push({
      key: 'monitor-stable',
      tone: TONE_OK,
      title: '当前运行指标没有明显异常',
      detail: '内容流入、账号入口、治理队列和容量账面没有出现明显偏移，可以继续按日常节奏巡检。',
      targetTab: 'overview',
      actionLabel: '保持巡检',
    });
  }

  return items;
}

export function runtimeMonitoringHeadline(items) {
  const critical = (items ?? []).filter((item) => item.tone === TONE_CRITICAL).length;
  const warning = (items ?? []).filter((item) => item.tone === TONE_WARNING).length;
  const info = (items ?? []).filter((item) => item.tone === TONE_INFO).length;

  if (critical > 0) return `${critical} 个运行问题需要立即处理`;
  if (warning > 0) return `${warning} 个运行风险需要跟进`;
  if (info > 0) return `${info} 个运行信号待观察`;
  return '当前运行指标整体平稳';
}

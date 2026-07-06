import { normalizeOverviewSummary } from './adminOverview.js';
import { formatMemoryBytes } from './memoryPresentation.js';

function isLocalOrigin(currentOrigin) {
  if (!currentOrigin) return true;
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(currentOrigin);
}

export function backupAssets(summary, { currentOrigin = '', registrationsEnabled = true } = {}) {
  const normalized = normalizeOverviewSummary(summary);

  return [
    {
      key: 'postgres',
      title: '业务数据',
      scope: `图片 ${normalized.total_memories} 张，举报 ${normalized.open_reports_count + normalized.resolved_reports_count + normalized.dismissed_reports_count} 条，用户资料与站点设置`,
      priority: '最高',
      frequency: '每日',
      exportRoute: '优先导出完整数据库备份',
      detail: '包含图片记录、用户资料、管理员权限、举报记录、操作日志和站点设置。恢复后才能重新关联文件、权限和治理记录。',
    },
    {
      key: 'storage',
      title: '图片文件',
      scope: `${normalized.total_memories} 张图片，当前已知容量 ${formatMemoryBytes(normalized.total_storage_bytes)}`,
      priority: '最高',
      frequency: '每日',
      exportRoute: '导出原图文件，并保持图片路径与图库记录一致',
      detail: '数据库恢复但文件丢失时，公开画廊、查看器、ZIP 下载都会直接失效。',
    },
    {
      key: 'auth',
      title: '账号状态',
      scope: `${normalized.total_users} 个账号，${normalized.unconfirmed_users} 个未确认，${normalized.invited_pending_users} 个邀请待确认`,
      priority: '高',
      frequency: registrationsEnabled ? '每周' : '每日',
      exportRoute: '保留用户清单、管理员身份和邀请状态快照',
      detail: '邀请制下更关键，因为账号发放和邮箱确认都依赖当前账号状态。',
    },
    {
      key: 'deployment',
      title: '部署与站点配置',
      scope: isLocalOrigin(currentOrigin) ? '当前仍是本地 / 未固定域名' : currentOrigin,
      priority: '中',
      frequency: '每次变更后',
      exportRoute: '记录站点入口、登录跳转、邮件模板和自定义域名设置',
      detail: '这些不是数据库内容，但丢失后分享链接、登录回跳和邀请邮件会一起异常。',
    },
  ];
}

export function backupRecoveryPlan(summary) {
  const normalized = normalizeOverviewSummary(summary);

  return [
    `1. 先恢复业务数据，保证 ${normalized.total_memories} 张图片记录、权限和举报状态先回到一致状态。`,
    '2. 再恢复图片文件，确认图片路径与图库记录一一对应。',
    '3. 然后核对用户、邀请状态和管理员账号，避免恢复后只有数据没有可登录账号。',
    '4. 最后恢复站点入口、登录跳转和邮件模板，再做分享链接和邀请邮件回归。',
  ];
}

export function backupOperationalNotes(summary, { currentOrigin = '', registrationsEnabled = true } = {}) {
  const normalized = normalizeOverviewSummary(summary);
  const notes = [];

  if (normalized.legacy_count > 0) {
    notes.push(`当前仍有 ${normalized.legacy_count} 张历史未归属图片，导出前最好先补 owner 或至少记录这批图片的范围。`);
  }
  if (normalized.unknown_size_count > 0) {
    notes.push(`当前仍有 ${normalized.unknown_size_count} 张大小未知，备份容量预估不能只看已知容量。`);
  }
  if (normalized.invited_pending_users > 0) {
    notes.push(`当前有 ${normalized.invited_pending_users} 个邀请待确认账号，恢复后需要优先验证邀请邮件是否还能正常到达。`);
  }
  if (!registrationsEnabled) {
    notes.push('当前站点使用邀请制，账号发放不依赖公开注册，恢复演练时必须包含管理员邀请流程。');
  }
  if (isLocalOrigin(currentOrigin)) {
    notes.push('当前站点入口仍是本地地址，备份策略里应额外记录计划中的正式域名，否则恢复后登录跳转无法直接复用。');
  }
  if (!notes.length) {
    notes.push('当前没有额外的备份特殊事项，按业务数据、图片文件、账号状态、站点配置四层顺序执行即可。');
  }

  return notes;
}

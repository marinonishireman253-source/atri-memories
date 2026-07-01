import { normalizeOverviewSummary } from './adminOverview.js';

const TONE_CRITICAL = 'critical';
const TONE_WARNING = 'warning';
const TONE_INFO = 'info';
const TONE_OK = 'ok';

export function retentionAssets(summary) {
  const normalized = normalizeOverviewSummary(summary);

  return [
    {
      key: 'public-memories',
      title: '公开图片与用户内容',
      retentionWindow: '长期保留，直到用户删除或管理员处理',
      reviewCadence: '每月抽查一次',
      detail: `当前共有 ${normalized.total_memories} 张图片，其中 ${normalized.featured_count} 张精选、${normalized.hidden_count} 张已下架。公开内容是站点核心资产，应以“用户主动删除”或“治理决定”作为主要出库条件。`,
      whyItMatters: '这是公开画廊、分享页和个人空间的主体内容，误删会直接影响用户体验。',
      targetTab: 'images',
      actionLabel: '去图片管理',
    },
    {
      key: 'moderation-evidence',
      title: '下架内容与举报上下文',
      retentionWindow: '至少保留到举报处理完成并复核后',
      reviewCadence: '每周巡检',
      detail: `当前有 ${normalized.open_reports_count} 条待处理举报、${normalized.resolved_reports_count} 条已处理举报、${normalized.dismissed_reports_count} 条已驳回举报。已下架图片和举报记录应一起复核，避免只删记录不留治理证据。`,
      whyItMatters: '内容治理需要可追溯证据，特别是已下架图片、举报原因和处理动作之间的关系。',
      targetTab: 'reports',
      actionLabel: '去举报处理',
    },
    {
      key: 'accounts-and-invites',
      title: '账号确认与邀请积压',
      retentionWindow: '未确认积压应在数日内处理，长期无响应应清理',
      reviewCadence: '每周巡检',
      detail: `当前有 ${normalized.unconfirmed_users} 个未确认邮箱账号、${normalized.invited_pending_users} 个邀请待确认账号，其中 ${normalized.stale_unconfirmed_users} 个未确认账号和 ${normalized.stale_invited_pending_users} 个邀请已超过 72 小时。`,
      whyItMatters: '长期积压的未确认账号会提高支持成本，也会让邀请和登录策略失去可控性。',
      targetTab: 'users',
      actionLabel: '去用户管理',
    },
    {
      key: 'audit-history',
      title: '后台审计与操作历史',
      retentionWindow: '建议长期保留，并定期导出',
      reviewCadence: '每月导出一次',
      detail: '管理员变更、内容治理、邀请发放和删除操作都依赖后台审计记录追溯。即使后续要清理旧业务数据，审计历史也应优先保全。',
      whyItMatters: '这层数据决定你能否解释“谁在什么时间做了什么动作”。',
      targetTab: 'logs',
      actionLabel: '去操作日志',
    },
    {
      key: 'asset-bookkeeping',
      title: '容量账面与历史图片修复',
      retentionWindow: '在上线前尽量清零',
      reviewCadence: '每次大规模整理后复核',
      detail: `当前有 ${normalized.legacy_count} 张历史未归属图片、${normalized.unknown_size_count} 张大小未知图片。这些数据不一定要删除，但必须补齐归属与大小，否则容量与权限账面永远不完整。`,
      whyItMatters: '不完整的图片元数据会直接影响容量判断、权限解释和未来迁移成本。',
      targetTab: 'images',
      actionLabel: '去图片管理',
    },
  ];
}

export function retentionActionQueue(summary) {
  const normalized = normalizeOverviewSummary(summary);
  const items = [];

  if (normalized.open_reports_count > 0) {
    items.push({
      key: 'retention-open-reports',
      tone: TONE_CRITICAL,
      title: '先处理待处理举报，再决定是否清理相关内容',
      detail: `${normalized.open_reports_count} 条举报仍未处理。涉及的图片、举报记录和操作日志不应提前清理。`,
      targetTab: 'reports',
      actionLabel: '去举报处理',
    });
  }

  if (normalized.hidden_count > 0) {
    items.push({
      key: 'retention-hidden-memories',
      tone: normalized.open_reports_count > 0 ? TONE_WARNING : TONE_INFO,
      title: '已下架图片需要周期复核',
      detail: `${normalized.hidden_count} 张图片当前处于下架状态。应区分“暂时隐藏待复核”和“长期保留为治理证据”的内容。`,
      targetTab: 'images',
      actionLabel: '去图片管理',
    });
  }

  if (normalized.stale_unconfirmed_users > 0 || normalized.stale_invited_pending_users > 0) {
    items.push({
      key: 'retention-stale-accounts',
      tone: TONE_WARNING,
      title: '清理长期未确认账号与邀请积压',
      detail: `${normalized.stale_unconfirmed_users} 个未确认账号、${normalized.stale_invited_pending_users} 个邀请中的账号已超过 72 小时，应决定继续跟进还是停用清理。`,
      targetTab: 'users',
      actionLabel: '去用户管理',
    });
  }

  if (normalized.legacy_count > 0 || normalized.unknown_size_count > 0) {
    items.push({
      key: 'retention-bookkeeping',
      tone: TONE_WARNING,
      title: '补齐历史图片账面，再谈长期留存',
      detail: `${normalized.legacy_count} 张历史未归属、${normalized.unknown_size_count} 张大小未知。它们会让“该删什么、该留什么”缺少完整依据。`,
      targetTab: 'images',
      actionLabel: '去图片管理',
    });
  }

  if (!items.length) {
    items.push({
      key: 'retention-healthy',
      tone: TONE_OK,
      title: '当前没有明显的数据留存积压',
      detail: '举报、下架内容、账号确认和图片账面没有出现明显堆积，可以按月度节奏继续巡检。',
      targetTab: 'overview',
      actionLabel: '保持巡检',
    });
  }

  return items;
}

export function retentionHeadline(items) {
  const critical = (items ?? []).filter((item) => item.tone === TONE_CRITICAL).length;
  const warning = (items ?? []).filter((item) => item.tone === TONE_WARNING).length;
  const info = (items ?? []).filter((item) => item.tone === TONE_INFO).length;

  if (critical > 0) return `${critical} 个留存问题需要先处理`;
  if (warning > 0) return `${warning} 个留存积压需要收口`;
  if (info > 0) return `${info} 个留存提醒待复核`;
  return '当前没有明显留存积压';
}

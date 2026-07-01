import { reasonLabel, reportStatusLabel } from '../../lib/reporting.js';

export function dateLabel(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function ownerLabel(memory) {
  if (memory.owner_email) return memory.owner_email;
  if (memory.owner_id) return memory.owner_id;
  return '历史图片 / 未归属';
}

export function statusMessage(action, total, failed) {
  const succeeded = total - failed;
  if (!failed) return `${action}完成：${succeeded} 张。`;
  if (!succeeded) return `${action}失败：${failed} 张均未完成。`;
  return `${action}完成 ${succeeded} 张，失败 ${failed} 张。`;
}

export function compactDate(value) {
  if (!value) return '未确认';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export function formatBytes(value) {
  const bytes = Number(value ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / 1024 ** exponent;
  return `${amount >= 10 || exponent === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[exponent]}`;
}

export function actionLabel(action) {
  switch (action) {
    case 'delete_memory':
      return '删除图片';
    case 'update_memory':
      return '编辑图片';
    case 'grant_admin':
      return '设为管理员';
    case 'revoke_admin':
      return '取消管理员';
    case 'update_user_upload_policy':
      return '调整上传权限';
    case 'invite_user':
      return '邀请用户';
    case 'resolve_report':
      return '处理举报';
    default:
      return action;
  }
}

export function detailSummary(log) {
  if (log.action === 'update_memory') {
    const before = log.details?.before ?? {};
    const after = log.details?.after ?? {};
    const changes = [];
    if (before.title !== after.title) changes.push(`标题：${before.title ?? ''} -> ${after.title ?? ''}`);
    if (before.caption !== after.caption) changes.push('描述已修改');
    if (JSON.stringify(before.tags ?? []) !== JSON.stringify(after.tags ?? [])) changes.push('标签已修改');
    if (before.visibility_status !== after.visibility_status) {
      changes.push(after.visibility_status === 'hidden' ? '已下架' : '已公开');
    }
    return changes.join('；') || '内容已更新';
  }
  if (log.action === 'delete_memory') {
    return log.details?.storage_path ? `Storage: ${log.details.storage_path}` : '图片和记录已删除';
  }
  if (log.action === 'grant_admin' || log.action === 'revoke_admin') {
    return log.details?.target_email ?? log.target_label ?? log.target_id;
  }
  if (log.action === 'update_user_upload_policy') {
    const enabled = log.details?.can_upload === false ? '暂停上传' : '允许上传';
    const limit = log.details?.upload_limit_total ?? '不限';
    return `${enabled}；总上限：${limit}`;
  }
  if (log.action === 'invite_user') {
    return log.details?.invited_email ?? log.target_label ?? log.target_id;
  }
  if (log.action === 'resolve_report') {
    const statusMap = {
      open: '重新打开',
      resolved: '标记已处理',
      dismissed: '驳回举报',
    };
    const note = log.details?.resolution_note ? `；备注：${log.details.resolution_note}` : '';
    return `${statusMap[log.details?.status] ?? log.details?.status ?? '已更新'}；原因：${reasonLabel(log.details?.reason)}${note}`;
  }
  return '';
}

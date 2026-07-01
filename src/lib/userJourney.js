import { createStatusNotice, errorNotice } from './userFeedback.js';

function userLabel(user) {
  return user?.email?.trim() || '当前账号';
}

export function homeSyncErrorNotice(message) {
  const rawMessage = String(message ?? '');
  const isQuotaOrServiceLimit =
    /exceed_egress_quota|restricted|quota|spend caps/i.test(rawMessage);

  if (isQuotaOrServiceLimit) {
    return createStatusNotice({
      tone: 'warning',
      title: '云端相册暂时休息中',
      body: '当前图片服务额度已触顶，公开相册会先保持本地页面体验。恢复云端服务后，记忆图片会自动回来。',
      icon: '!',
    });
  }

  return errorNotice('当前无法读取云端记忆，请稍后刷新相册。', '画廊同步暂时不可用');
}

export function sharedMemoryLoadingNotice() {
  return createStatusNotice({
    tone: 'info',
    title: '正在读取分享图片',
    body: '如果是首次打开或来自外部分享，可能需要几秒钟。',
    icon: 'i',
  });
}

export function uploadDisabledHomeNotice() {
  return createStatusNotice({
    tone: 'warning',
    title: '当前暂不开放普通用户上传',
    body: '这是站点级策略限制。你仍然可以浏览公开画廊和管理自己的已有内容。',
    icon: '!',
  });
}

export function currentUserScopeNotice(user) {
  return createStatusNotice({
    tone: 'info',
    title: '正在查看我的图片',
    body: `${userLabel(user)} 上传的图片会优先显示，便于继续整理和检查。`,
  });
}

export function currentFavoritesScopeNotice(user) {
  return createStatusNotice({
    tone: 'info',
    title: '正在查看我的收藏',
    body: `${userLabel(user)} 收藏过的图片会优先显示，方便你集中回看和继续筛选。`,
  });
}

export function uploadCompletedJourneyNotice({ uploadedCount, user }) {
  return createStatusNotice({
    tone: 'success',
    title: `已保存 ${uploadedCount} 张图片`,
    body: `已切换到 ${userLabel(user)} 的图片范围，方便继续确认这批新内容。`,
    icon: 'OK',
  });
}

export function batchDeleteJourneyNotice({ succeeded, failed, user }) {
  if (failed === 0) {
    return createStatusNotice({
      tone: 'success',
      title: `已删除 ${succeeded} 张图片`,
      body: `${userLabel(user)} 的图片范围已保持打开，可以继续整理剩余内容。`,
      icon: 'OK',
    });
  }

  if (succeeded > 0) {
    return createStatusNotice({
      tone: 'warning',
      title: `已删除 ${succeeded} 张，${failed} 张未删除`,
      body: '删除失败的图片会继续保留为选中状态，方便你修正后再次尝试。',
      icon: '!',
    });
  }

  return createStatusNotice({
    tone: 'error',
    title: `本次 ${failed} 张都没有删除成功`,
    body: '请确认这些图片仍属于你，或稍后重试。',
    icon: '!',
  });
}

export function memoryUpdatedJourneyNotice(title) {
  return createStatusNotice({
    tone: 'success',
    title: '图片信息已更新',
    body: `《${title || '未命名记忆'}》的标题、描述或标签已经保存。`,
    icon: 'OK',
  });
}

export function memoryDeletedJourneyNotice(title) {
  return createStatusNotice({
    tone: 'success',
    title: '图片已删除',
    body: `《${title || '未命名记忆'}》已从当前整理序列中移除。`,
    icon: 'OK',
  });
}

export const NOTICE_TONE_INFO = 'info';
export const NOTICE_TONE_SUCCESS = 'success';
export const NOTICE_TONE_WARNING = 'warning';
export const NOTICE_TONE_ERROR = 'error';
export const NOTICE_TONE_EMPTY = 'empty';

export function createStatusNotice({
  tone = NOTICE_TONE_INFO,
  title,
  body = '',
  icon = null,
  compact = false,
}) {
  return {
    tone,
    title,
    body,
    icon,
    compact,
  };
}

export function normalizeUserFacingError(message) {
  const rawMessage = String(message ?? '').trim();
  const isQuotaOrServiceLimit =
    /exceed_egress_quota|restricted due|spend caps|project owner|quota/i.test(rawMessage);

  if (isQuotaOrServiceLimit) {
    return {
      title: '云端服务暂时不可用',
      body: '当前云端服务额度已触顶，登录、上传、收藏或读取云端图片可能暂时失败。恢复服务额度后再试即可。',
      tone: NOTICE_TONE_WARNING,
      icon: '!',
    };
  }

  return {
    title: '',
    body: rawMessage,
    tone: NOTICE_TONE_ERROR,
    icon: '!',
  };
}

export function errorNotice(message, title = '操作未完成') {
  const normalized = normalizeUserFacingError(message);

  return createStatusNotice({
    tone: normalized.tone,
    title: normalized.title || title,
    body: normalized.body,
    icon: normalized.icon,
  });
}

export function previewModeNotice(title, body) {
  return createStatusNotice({
    tone: NOTICE_TONE_INFO,
    title,
    body,
    icon: 'i',
  });
}

export function registrationClosedNotice() {
  return createStatusNotice({
    tone: NOTICE_TONE_INFO,
    title: '当前仅开放已有账号登录',
    body: '公开注册已暂停，请联系管理员创建账号或发送邀请。',
    icon: 'i',
  });
}

export function authEmailRequiredNotice() {
  return createStatusNotice({
    tone: NOTICE_TONE_WARNING,
    title: '请先填写邮箱地址',
    body: '重置密码和重发确认邮件都需要先提供邮箱。',
    icon: '!',
  });
}

export function authRegistrationSuccessNotice() {
  return createStatusNotice({
    tone: NOTICE_TONE_SUCCESS,
    title: '注册成功',
    body: '如果站点要求邮箱确认，请先检查邮箱，再返回登录。',
    icon: 'OK',
  });
}

export function authPasswordResetSentNotice() {
  return createStatusNotice({
    tone: NOTICE_TONE_SUCCESS,
    title: '重置密码邮件已发送',
    body: '请检查收件箱和垃圾邮件箱，按邮件提示继续操作。',
    icon: 'OK',
  });
}

export function authConfirmationSentNotice() {
  return createStatusNotice({
    tone: NOTICE_TONE_SUCCESS,
    title: '确认邮件已重新发送',
    body: '如果长时间未收到，请确认邮箱地址是否填写正确。',
    icon: 'OK',
  });
}

export function uploadSelectionLimitNotice(batchLimit) {
  return createStatusNotice({
    tone: NOTICE_TONE_WARNING,
    title: `单次最多上传 ${batchLimit} 张`,
    body: `已保留前 ${batchLimit} 张图片，其余图片本次不会加入上传队列。`,
    icon: '!',
  });
}

export function uploadPendingNotice(hasEntries) {
  return hasEntries
    ? createStatusNotice({
        tone: NOTICE_TONE_INFO,
        title: '当前批次已全部保存',
        body: '如果还要继续上传，请重新选择新的图片。',
        icon: 'i',
      })
    : createStatusNotice({
        tone: NOTICE_TONE_WARNING,
        title: '请选择需要收藏的图片',
        body: '支持一次选择多张图片，保存前也可以逐张修改标题。',
        icon: '!',
      });
}

export function uploadDraftBlockedNotice(summary) {
  return createStatusNotice({
    tone: NOTICE_TONE_WARNING,
    title: '请先处理无法上传的图片',
    body: summary?.blocked
      ? `当前有 ${summary.blocked} 张图片不符合本地规则，请移除后再保存。`
      : '请检查文件类型、大小和标题后再保存。',
    icon: '!',
  });
}

export function uploadResultNotice({ succeeded, failed }) {
  if (failed === 0) {
    return createStatusNotice({
      tone: NOTICE_TONE_SUCCESS,
      title: `已保存 ${succeeded} 张图片`,
      body: '本批图片已全部写入画廊。',
      icon: 'OK',
    });
  }

  if (succeeded > 0) {
    return createStatusNotice({
      tone: NOTICE_TONE_WARNING,
      title: `已保存 ${succeeded} 张，${failed} 张失败`,
      body: '修正失败项后可直接重试，不需要重新上传已成功的图片。',
      icon: '!',
    });
  }

  return createStatusNotice({
    tone: NOTICE_TONE_ERROR,
    title: `本次 ${failed} 张均未保存`,
    body: '请查看每项错误原因，修正后再重试。',
    icon: '!',
  });
}

export function profileSavedNotice() {
  return createStatusNotice({
    tone: NOTICE_TONE_SUCCESS,
    title: '个人资料已保存',
    body: '新的显示名和简介会立即用于当前账号展示。',
    icon: 'OK',
  });
}

export function uploadDisabledNotice() {
  return createStatusNotice({
    tone: NOTICE_TONE_WARNING,
    title: '当前暂不开放普通用户上传',
    body: '这是站点级策略限制。管理员仍可维护内容，普通用户需等待重新开放。',
    icon: '!',
  });
}

export function favoriteSavedNotice(title) {
  return createStatusNotice({
    tone: NOTICE_TONE_SUCCESS,
    title: '已加入收藏',
    body: `《${title || '未命名记忆'}》已放进你的收藏列表。`,
    icon: 'OK',
  });
}

export function favoriteRemovedNotice(title) {
  return createStatusNotice({
    tone: NOTICE_TONE_INFO,
    title: '已取消收藏',
    body: `《${title || '未命名记忆'}》已从你的收藏列表移除。`,
    icon: 'i',
  });
}

export function userTagStatsEmptyNotice() {
  return createStatusNotice({
    tone: NOTICE_TONE_EMPTY,
    title: '还没有可统计的标签',
    body: '上传时给图片加标签，之后这里会自动汇总你的常用标签。',
    icon: '◇',
    compact: false,
  });
}

export function galleryEmptyNotice({ filtering, favoritesOnly = false }) {
  if (favoritesOnly) {
    return filtering
      ? createStatusNotice({
          tone: NOTICE_TONE_EMPTY,
          title: '收藏里没有匹配的记忆',
          body: '换个关键词、标签或放宽时间范围后再试。',
          icon: '◇',
          compact: true,
        })
      : createStatusNotice({
          tone: NOTICE_TONE_EMPTY,
          title: '你还没有收藏图片',
          body: '先在公开画廊里挑几张喜欢的图片，它们会出现在这里。',
          icon: '◇',
          compact: true,
        });
  }

  return filtering
    ? createStatusNotice({
        tone: NOTICE_TONE_EMPTY,
        title: '没有匹配的记忆',
        body: '换个关键词、标签或放宽时间范围后再试。',
        icon: '◇',
        compact: true,
      })
    : createStatusNotice({
        tone: NOTICE_TONE_EMPTY,
        title: '还没有被收藏的瞬间',
        body: '上传第一张照片，让属于你的海岸线从这里开始。',
        icon: '◇',
        compact: true,
      });
}

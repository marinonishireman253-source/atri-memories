import { createStatusNotice } from './userFeedback.js';

export function userOnboardingModel({
  user,
  loadingSummary,
  summary,
  uploadDisabled,
  galleryScope,
}) {
  if (!user || loadingSummary || !galleryScope) {
    return null;
  }

  if ((summary.uploadCount ?? 0) === 0 && uploadDisabled) {
    return {
      key: 'first-upload-paused',
      tone: 'warning',
      title: '当前还不能开始上传',
      body: '你的账号还没有图片，但站点当前暂停了普通用户上传。先浏览公开画廊，等管理员重新开放后再建立自己的相册。',
      actionKey: 'show-public',
      actionLabel: '查看公开画廊',
    };
  }

  if (galleryScope.isCurrentUserScope && galleryScope.refined && galleryScope.totalCount === 0) {
    return {
      key: 'my-images-refined-empty',
      tone: 'warning',
      title: '当前筛选没有命中你的图片',
      body: '你已经上传过图片，但当前的关键词、标签或时间条件把结果过滤空了。先重置到“我的图片”基础范围，再继续筛选更稳妥。',
      actionKey: 'reset-my-images',
      actionLabel: '重置我的筛选',
    };
  }

  return null;
}

export function userOnboardingNotice(model) {
  if (!model) return null;

  return createStatusNotice({
    tone: model.tone,
    title: model.title,
    body: model.body,
    icon: model.tone === 'warning' ? '!' : 'i',
  });
}

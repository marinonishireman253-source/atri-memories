export function formatLatestUploadDate(value) {
  if (!value) return '暂无上传';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}

export function userDisplayName(user, profile) {
  return profile?.display_name || user?.email || '当前用户';
}

export function latestUploadLabel(summary) {
  return formatLatestUploadDate(summary?.latestUploadAt);
}

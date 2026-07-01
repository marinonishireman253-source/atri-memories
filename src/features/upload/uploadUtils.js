export function titleFromFilename(filename) {
  const stem = filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return stem || '未命名记忆';
}

import { buildUploadSelectionIssues } from './uploadDraftModel.js';

export function selectionEntries(files, { maxFileSize = null, createPreviewUrl = null } = {}) {
  const issues = buildUploadSelectionIssues(files, maxFileSize);

  return files.map((file, index) => {
    const issue = issues[index];

    return {
      id: crypto.randomUUID(),
      file,
      previewUrl: file.type.startsWith('image/') && createPreviewUrl ? createPreviewUrl(file) : '',
      title: titleFromFilename(file.name),
      status: issue ? 'error' : 'ready',
      error: issue,
      localIssue: Boolean(issue),
    };
  });
}

export function uploadStatusLabel(status) {
  switch (status) {
    case 'uploading':
      return '存入中';
    case 'success':
      return '已保存';
    case 'error':
      return '失败';
    default:
      return '待上传';
  }
}

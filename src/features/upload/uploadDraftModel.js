export function uploadFileSizeLabel(bytes) {
  const size = Number(bytes ?? 0);
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${size} B`;
}

export function uploadDraftEntryIssue(file, maxFileSize) {
  if (!file?.type?.startsWith('image/')) {
    return '只能上传图片文件。';
  }
  if (typeof maxFileSize === 'number' && file.size > maxFileSize) {
    return `图片大小 ${uploadFileSizeLabel(file.size)} 超过上限 ${uploadFileSizeLabel(maxFileSize)}。`;
  }
  return '';
}

export function uploadDraftFileKey(file) {
  return [
    String(file?.name ?? '').trim().toLowerCase(),
    Number(file?.size ?? 0),
    Number(file?.lastModified ?? 0),
  ].join('::');
}

export function buildUploadSelectionIssues(files, maxFileSize) {
  const seen = new Set();

  return files.map((file) => {
    const issue = uploadDraftEntryIssue(file, maxFileSize);
    if (issue) return issue;

    const key = uploadDraftFileKey(file);
    if (seen.has(key)) {
      return '疑似重复：本批次已包含同名、同大小且修改时间相同的文件。';
    }

    seen.add(key);
    return '';
  });
}

export function buildUploadDraftSummary(entries) {
  const total = entries.length;
  const saved = entries.filter((entry) => entry.status === 'success').length;
  const uploading = entries.filter((entry) => entry.status === 'uploading').length;
  const blocked = entries.filter((entry) => entry.localIssue).length;
  const failed = entries.filter((entry) => entry.status === 'error' && !entry.localIssue).length;
  const ready = entries.filter((entry) =>
    entry.status !== 'success' &&
    entry.status !== 'uploading' &&
    !entry.localIssue,
  ).length;

  return {
    total,
    ready,
    saved,
    uploading,
    blocked,
    failed,
    canSubmit: ready > 0 && blocked === 0,
    hasLocalBlockers: blocked > 0,
    label: total
      ? `已选 ${total} 张，待保存 ${ready} 张${blocked ? `，需处理 ${blocked} 张` : ''}`
      : '还未选择图片',
  };
}

export function buildUploadProgressModel(entries) {
  const total = entries.length;
  const blocked = entries.filter((entry) => entry.localIssue).length;
  const actionable = Math.max(total - blocked, 0);
  const saved = entries.filter((entry) => entry.status === 'success').length;
  const failed = entries.filter((entry) => entry.status === 'error' && !entry.localIssue).length;
  const uploading = entries.filter((entry) => entry.status === 'uploading').length;
  const completed = saved + failed;
  const waiting = Math.max(actionable - completed - uploading, 0);
  const progressUnits = completed + (uploading > 0 ? 0.5 : 0);
  const percent = actionable ? Math.min(100, Math.round((progressUnits / actionable) * 100)) : 0;

  let label = total ? '等待开始上传' : '尚未选择图片';
  if (uploading > 0) {
    label = uploading > 1
      ? `正在并发上传 ${uploading} 张，已处理 ${completed} / ${actionable}`
      : `正在上传 ${completed + 1} / ${actionable}`;
  } else if (actionable > 0 && completed === actionable) {
    label = failed > 0 ? `已处理 ${completed} 张，${failed} 张失败` : `已完成 ${saved} 张`;
  } else if (blocked > 0) {
    label = `需先处理 ${blocked} 张`;
  } else if (actionable > 0) {
    label = `准备上传 ${actionable} 张`;
  }

  const detail = [
    saved ? `成功 ${saved}` : null,
    failed ? `失败 ${failed}` : null,
    uploading ? `进行中 ${uploading}` : null,
    waiting ? `等待 ${waiting}` : null,
    blocked ? `阻断 ${blocked}` : null,
  ].filter(Boolean).join(' / ') || '选择图片后显示批次进度';

  return {
    total,
    actionable,
    saved,
    failed,
    uploading,
    waiting,
    blocked,
    completed,
    percent,
    label,
    detail,
    active: uploading > 0,
    tone: blocked > 0 ? 'blocked' : failed > 0 ? 'warning' : completed === actionable && actionable > 0 ? 'complete' : 'idle',
  };
}

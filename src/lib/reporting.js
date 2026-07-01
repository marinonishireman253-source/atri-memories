export const REPORT_STATUS_OPEN = 'open';
export const REPORT_STATUS_RESOLVED = 'resolved';
export const REPORT_STATUS_DISMISSED = 'dismissed';

export const REPORT_STATUS_OPTIONS = [
  { value: REPORT_STATUS_OPEN, label: '待处理' },
  { value: REPORT_STATUS_RESOLVED, label: '已处理' },
  { value: REPORT_STATUS_DISMISSED, label: '已驳回' },
];

export const REPORT_REASON_OPTIONS = [
  { value: 'inappropriate', label: '不适合公开展示' },
  { value: 'copyright', label: '版权或来源问题' },
  { value: 'privacy', label: '隐私或个人信息' },
  { value: 'spam', label: '垃圾内容' },
  { value: 'other', label: '其他问题' },
];

export const REPORT_CODE_DUPLICATE_OPEN = 'duplicate_open_report';
export const REPORT_CODE_MEMORY_COOLDOWN = 'memory_report_cooldown';
export const REPORT_CODE_RATE_LIMIT = 'report_rate_limited';

export function reasonLabel(value) {
  return REPORT_REASON_OPTIONS.find((reason) => reason.value === value)?.label ?? value;
}

export function reportStatusLabel(value) {
  return REPORT_STATUS_OPTIONS.find((status) => status.value === value)?.label ?? '待处理';
}

export function reportStatusTone(value) {
  if (value === REPORT_STATUS_RESOLVED) return 'admin';
  if (value === REPORT_STATUS_DISMISSED) return 'blocked';
  return '';
}

export function normalizeReport(report) {
  if (!report) return report;

  return {
    ...report,
    status: report.status ?? REPORT_STATUS_OPEN,
    memory: report.memory ?? report.memories ?? null,
    resolution_note: report.resolution_note?.trim() || null,
    note: report.note?.trim() || null,
  };
}

export function normalizeReportSummary(summary) {
  return {
    open_count: Number(summary?.open_count ?? 0),
    resolved_count: Number(summary?.resolved_count ?? 0),
    dismissed_count: Number(summary?.dismissed_count ?? 0),
  };
}

export function reportSummaryTotal(summary) {
  const normalized = normalizeReportSummary(summary);
  return normalized.open_count + normalized.resolved_count + normalized.dismissed_count;
}

export function hasOpenReports(summary) {
  return normalizeReportSummary(summary).open_count > 0;
}

export function hasAnyReports(summary) {
  return reportSummaryTotal(summary) > 0;
}

export function reportSummaryLabel(summary) {
  const normalized = normalizeReportSummary(summary);
  if (normalized.open_count > 0) {
    return `${normalized.open_count} 条待处理举报`;
  }
  const total = reportSummaryTotal(normalized);
  if (total > 0) {
    return `${total} 条已处理举报`;
  }
  return '无举报';
}

export function reportSummaryItems(summary) {
  const normalized = normalizeReportSummary(summary);
  const items = [];

  if (normalized.open_count > 0) {
    items.push({
      key: REPORT_STATUS_OPEN,
      label: `待处理 ${normalized.open_count}`,
      tone: 'blocked',
    });
  }
  if (normalized.resolved_count > 0) {
    items.push({
      key: REPORT_STATUS_RESOLVED,
      label: `已处理 ${normalized.resolved_count}`,
      tone: 'admin',
    });
  }
  if (normalized.dismissed_count > 0) {
    items.push({
      key: REPORT_STATUS_DISMISSED,
      label: `已驳回 ${normalized.dismissed_count}`,
      tone: '',
    });
  }

  return items;
}

function retryAfterLabel(seconds) {
  const safeSeconds = Number(seconds);
  if (!Number.isFinite(safeSeconds) || safeSeconds <= 0) {
    return '稍后';
  }

  if (safeSeconds < 120) {
    return `${safeSeconds} 秒`;
  }

  const minutes = Math.ceil(safeSeconds / 60);
  return `${minutes} 分钟`;
}

export function reportSubmissionErrorMessage(payload) {
  const code = payload?.code;
  const retryLabel = retryAfterLabel(payload?.retry_after_seconds);
  const retryMessage = retryLabel === '稍后'
    ? '请稍后再试。'
    : `请在 ${retryLabel}后再试。`;

  if (code === REPORT_CODE_DUPLICATE_OPEN) {
    return '你已经为这张图片提交过待处理举报，无需重复提交。';
  }
  if (code === REPORT_CODE_MEMORY_COOLDOWN) {
    return `同一张图片短时间内不能重复举报，${retryMessage}`;
  }
  if (code === REPORT_CODE_RATE_LIMIT) {
    return `举报过于频繁，${retryMessage}`;
  }
  return payload?.error || '举报提交失败，请稍后重试。';
}

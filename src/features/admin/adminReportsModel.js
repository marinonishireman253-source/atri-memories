import { memoryTitle } from '../../lib/memoryContent.js';
import { reasonLabel, reportStatusLabel } from '../../lib/reporting.js';

export const ADMIN_REPORT_REASON_FILTERS = [
  { value: 'all', label: '全部原因' },
  { value: 'inappropriate', label: reasonLabel('inappropriate') },
  { value: 'copyright', label: reasonLabel('copyright') },
  { value: 'privacy', label: reasonLabel('privacy') },
  { value: 'spam', label: reasonLabel('spam') },
  { value: 'other', label: reasonLabel('other') },
];

function reportSearchText(report) {
  return [
    memoryTitle(report.memory),
    report.reporter_email ?? '',
    report.reporter_user_id ?? '',
    reasonLabel(report.reason),
    report.note ?? '',
    report.resolution_note ?? '',
    reportStatusLabel(report.status),
  ].join(' ').toLowerCase();
}

export function filterAdminReports(reports, { query = '', reason = 'all' } = {}) {
  const normalizedQuery = query.trim().toLowerCase();
  return reports.filter((report) =>
    (reason === 'all' || report.reason === reason) &&
    (!normalizedQuery || reportSearchText(report).includes(normalizedQuery)),
  );
}

export function buildAdminReportQueueSummary(reports) {
  const total = reports.length;
  const missingMemoryCount = reports.filter((report) => !report.memory).length;
  const anonymousCount = reports.filter((report) => !report.reporter_user_id).length;
  const reasonCounts = ADMIN_REPORT_REASON_FILTERS
    .filter((reason) => reason.value !== 'all')
    .map((reason) => ({
      ...reason,
      count: reports.filter((report) => report.reason === reason.value).length,
    }))
    .filter((reason) => reason.count > 0);

  return {
    total,
    missingMemoryCount,
    anonymousCount,
    reasonCounts,
    headline: total ? `${total} 条举报记录` : '当前没有举报记录',
  };
}

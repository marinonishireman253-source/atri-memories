import { useCallback, useState } from 'react';
import { hydrateMemoryMediaUrl } from '../lib/memoryMedia.js';
import {
  normalizeReport,
  reportSubmissionErrorMessage,
  REPORT_REASON_OPTIONS,
} from '../lib/reporting.js';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient.js';

export const reportReasons = REPORT_REASON_OPTIONS;

async function hydrateReport(report) {
  const normalized = normalizeReport(report);
  return {
    ...normalized,
    memory: await hydrateMemoryMediaUrl(normalized.memory),
  };
}

async function readFunctionErrorPayload(error) {
  const context = error?.context;
  if (!context || typeof context.json !== 'function') return null;

  try {
    return await context.json();
  } catch {
    return null;
  }
}

export function useReports() {
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [mutatingReport, setMutatingReport] = useState('');
  const [reportError, setReportError] = useState('');

  const submitReport = async ({ memoryId, reason, note, reporterEmail }) => {
    if (!hasSupabaseConfig) {
      throw new Error('当前为预览模式，无法提交举报。');
    }

    const { data, error } = await supabase.functions.invoke('submit-report', {
      body: {
        memory_id: memoryId,
        reason,
        note,
        reporter_email: reporterEmail,
      },
    });

    if (error) {
      const payload = await readFunctionErrorPayload(error);
      throw new Error(reportSubmissionErrorMessage(payload));
    }
    return data?.report ?? null;
  };

  const loadReports = useCallback(async ({ status = 'open' } = {}) => {
    if (!hasSupabaseConfig) return;

    setLoadingReports(true);
    setReportError('');

    try {
      const { data, error } = await supabase.functions.invoke('manage-reports', {
        body: {
          action: 'list',
          status,
        },
      });
      if (error) throw error;
      setReports(await Promise.all((data.reports ?? []).map(hydrateReport)));
    } catch {
      setReportError('无法读取举报列表，请确认当前账号仍是管理员。');
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const updateReport = async ({ reportId, status, resolutionNote }) => {
    setMutatingReport(reportId);
    setReportError('');

    try {
      const { data, error } = await supabase.functions.invoke('manage-reports', {
        body: {
          action: 'update',
          report_id: reportId,
          status,
          resolution_note: resolutionNote,
        },
      });
      if (error) throw error;
      const nextReport = await hydrateReport(data.report);
      setReports((current) =>
        current.map((report) => (report.id === reportId ? nextReport : report)),
      );
      return nextReport;
    } catch {
      setReportError('处理举报失败，请稍后重试。');
      throw new Error('处理举报失败，请稍后重试。');
    } finally {
      setMutatingReport('');
    }
  };

  return {
    reports,
    loadingReports,
    mutatingReport,
    reportError,
    submitReport,
    loadReports,
    updateReport,
  };
}

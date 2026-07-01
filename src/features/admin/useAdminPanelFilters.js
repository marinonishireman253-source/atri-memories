import { useMemo, useState } from 'react';
import { buildAdminLogSummary, filterAdminLogs } from './adminLogsModel.js';
import { buildAdminReportQueueSummary, filterAdminReports } from './adminReportsModel.js';
import { buildAdminUserSegments, filterAdminUsers } from './adminUsersModel.js';

export function useAdminPanelFilters({ users, reports, logs }) {
  const [userQuery, setUserQuery] = useState('');
  const [userSegment, setUserSegment] = useState('all');
  const [inviteEmail, setInviteEmail] = useState('');
  const [reportStatus, setReportStatus] = useState('open');
  const [reportQuery, setReportQuery] = useState('');
  const [reportReason, setReportReason] = useState('all');
  const [logQuery, setLogQuery] = useState('');
  const [logAction, setLogAction] = useState('all');

  const filteredUsers = useMemo(() => {
    return filterAdminUsers(users, { query: userQuery, segmentKey: userSegment });
  }, [userQuery, userSegment, users]);

  const userSegments = useMemo(() => buildAdminUserSegments(users), [users]);

  const filteredReports = useMemo(
    () => filterAdminReports(reports, { query: reportQuery, reason: reportReason }),
    [reportQuery, reportReason, reports],
  );

  const reportQueueSummary = useMemo(
    () => buildAdminReportQueueSummary(reports),
    [reports],
  );

  const filteredLogs = useMemo(
    () => filterAdminLogs(logs, { query: logQuery, action: logAction }),
    [logAction, logQuery, logs],
  );

  const logSummary = useMemo(() => buildAdminLogSummary(logs), [logs]);

  return {
    userQuery,
    setUserQuery,
    userSegment,
    setUserSegment,
    inviteEmail,
    setInviteEmail,
    reportStatus,
    setReportStatus,
    reportQuery,
    setReportQuery,
    reportReason,
    setReportReason,
    logQuery,
    setLogQuery,
    logAction,
    setLogAction,
    filteredUsers,
    userSegments,
    filteredReports,
    reportQueueSummary,
    filteredLogs,
    logSummary,
  };
}

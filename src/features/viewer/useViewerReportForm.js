import { useEffect, useState } from 'react';
import { reportReasons, useReports } from '../../hooks/useReports.js';

export function useViewerReportForm({ memory, user }) {
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState(reportReasons[0].value);
  const [note, setNote] = useState('');
  const [reporterEmail, setReporterEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { submitReport } = useReports();

  useEffect(() => {
    setReporting(false);
    setReason(reportReasons[0].value);
    setNote('');
    setReporterEmail(user?.email ?? '');
    setMessage('');
    setSuccess('');
  }, [memory.id, user?.email]);

  useEffect(() => {
    setReporterEmail(user?.email ?? '');
  }, [user?.email]);

  const toggle = () => {
    setReporting((current) => !current);
    setMessage('');
    setSuccess('');
  };

  const cancel = () => {
    setReporting(false);
    setMessage('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setSuccess('');

    if (!user && reporterEmail.trim() && !reporterEmail.includes('@')) {
      setMessage('联系邮箱格式不正确。');
      return;
    }

    try {
      setSubmitting(true);
      await submitReport({
        memoryId: memory.id,
        reason,
        note,
        reporterEmail: user?.email ? null : reporterEmail,
      });
      setSuccess('举报已提交，管理员会在后台处理。');
      setReporting(false);
      setNote('');
      if (!user) setReporterEmail('');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    reporting,
    setReporting,
    reason,
    setReason,
    note,
    setNote,
    reporterEmail,
    setReporterEmail,
    message,
    setMessage,
    success,
    submitting,
    toggle,
    cancel,
    submit,
  };
}

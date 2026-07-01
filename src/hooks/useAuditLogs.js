import { useCallback, useState } from 'react';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient.js';

export function useAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logError, setLogError] = useState('');

  const loadLogs = useCallback(async () => {
    if (!hasSupabaseConfig) return;

    setLoadingLogs(true);
    setLogError('');

    try {
      const { data, error } = await supabase.functions.invoke('manage-audit-logs', {
        body: { action: 'list' },
      });
      if (error) throw error;
      setLogs(data.logs ?? []);
    } catch {
      setLogError('无法读取操作日志，请确认当前账号仍是管理员。');
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  return {
    logs,
    loadingLogs,
    logError,
    loadLogs,
  };
}

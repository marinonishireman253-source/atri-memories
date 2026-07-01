import { useCallback, useState } from 'react';
import { EMPTY_OVERVIEW_SUMMARY, normalizeOverviewSummary } from '../lib/adminOverview.js';
import { hydrateMemoryMediaUrls } from '../lib/memoryMedia.js';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient.js';

const emptyOverview = {
  summary: EMPTY_OVERVIEW_SUMMARY,
  recent_memories: [],
  recent_logs: [],
};

export function useAdminOverview() {
  const [overview, setOverview] = useState(emptyOverview);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState('');

  const loadOverview = useCallback(async () => {
    if (!hasSupabaseConfig) return;

    setLoadingOverview(true);
    setOverviewError('');

    try {
      const { data, error } = await supabase.functions.invoke('manage-overview', {
        body: { action: 'summary' },
      });
      if (error) throw error;
      const recentMemories = await hydrateMemoryMediaUrls(data.recent_memories ?? []);
      setOverview({
        summary: normalizeOverviewSummary(data.summary),
        recent_memories: recentMemories,
        recent_logs: data.recent_logs ?? [],
      });
    } catch {
      setOverviewError('无法读取运维概览，请确认当前账号仍是管理员。');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  return {
    overview,
    loadingOverview,
    overviewError,
    loadOverview,
  };
}

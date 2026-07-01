import { useCallback, useEffect, useState } from 'react';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient.js';
import { normalizeTags } from '../lib/tags.js';

const SUMMARY_LIMIT = 1000;

function buildTagStats(rows) {
  const counts = new Map();
  rows.forEach((memory) => {
    normalizeTags(memory.tags ?? []).forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'))
    .slice(0, 8);
}

function buildStorageStats(rows) {
  return rows.reduce(
    (stats, memory) => {
      const size = Number(memory.file_size_bytes ?? 0);
      if (Number.isFinite(size) && size > 0) {
        stats.totalBytes += size;
        stats.knownCount += 1;
      } else {
        stats.unknownCount += 1;
      }
      return stats;
    },
    { totalBytes: 0, knownCount: 0, unknownCount: 0 },
  );
}

export function useUserSummary(user) {
  const [summary, setSummary] = useState({
    uploadCount: 0,
    favoritesCount: 0,
    latestUploadAt: null,
    tagStats: [],
    profile: null,
    uploadPolicy: null,
    storageStats: buildStorageStats([]),
  });
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const loadSummary = useCallback(async () => {
    if (!user || !supabase) {
      setSummary({
        uploadCount: 0,
        favoritesCount: 0,
        latestUploadAt: null,
        tagStats: [],
        profile: null,
        uploadPolicy: null,
        storageStats: buildStorageStats([]),
      });
      return;
    }

    setLoadingSummary(true);
    setSummaryError('');

    try {
      const [
        { data: profileData, error: profileError },
        { data: memoryRows, error: memoryError, count },
        { count: favoriteCount, error: favoritesError },
        { data: uploadPolicyData, error: uploadPolicyError },
      ] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('display_name, bio, can_upload, upload_limit_total, created_at, updated_at')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('memories')
          .select('id, tags, created_at, file_size_bytes', { count: 'exact' })
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(SUMMARY_LIMIT),
        supabase
          .from('memory_favorites')
          .select('memory_id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .rpc('upload_policy_state', { check_user_id: user.id })
          .single(),
      ]);

      if (profileError) throw profileError;
      if (memoryError) throw memoryError;
      if (favoritesError) throw favoritesError;
      if (uploadPolicyError) throw uploadPolicyError;

      setSummary({
        uploadCount: count ?? memoryRows?.length ?? 0,
        favoritesCount: favoriteCount ?? 0,
        latestUploadAt: memoryRows?.[0]?.created_at ?? null,
        tagStats: buildTagStats(memoryRows ?? []),
        profile: profileData ?? null,
        uploadPolicy: uploadPolicyData ?? null,
        storageStats: buildStorageStats(memoryRows ?? []),
      });
    } catch (error) {
      setSummaryError('无法读取个人统计，请稍后重试。');
    } finally {
      setLoadingSummary(false);
    }
  }, [user]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const saveProfile = async ({ displayName, bio }) => {
    if (!user || !supabase) {
      throw new Error('请先登录后再编辑个人资料。');
    }

    const nextDisplayName = displayName.trim() || null;
    const nextBio = bio.trim() || null;

    if (nextDisplayName && nextDisplayName.length > 40) {
      throw new Error('显示名不能超过 40 个字符。');
    }
    if (nextBio && nextBio.length > 160) {
      throw new Error('简介不能超过 160 个字符。');
    }

    setSavingProfile(true);
    setSummaryError('');

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: user.id,
            display_name: nextDisplayName,
            bio: nextBio,
          },
          { onConflict: 'user_id' },
        )
        .select('display_name, bio, created_at, updated_at')
        .single();

      if (error) throw error;

      setSummary((current) => ({
        ...current,
        profile: data,
      }));
      return data;
    } catch {
      throw new Error('保存个人资料失败，请稍后重试。');
    } finally {
      setSavingProfile(false);
    }
  };

  return {
    connected: hasSupabaseConfig,
    summary,
    loadingSummary,
    savingProfile,
    summaryError,
    refreshSummary: loadSummary,
    saveProfile,
  };
}

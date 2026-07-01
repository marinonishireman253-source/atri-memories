import { useCallback, useEffect, useMemo, useState } from 'react';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient.js';
import { defaultTagPresets, normalizeTags } from '../lib/tags.js';

export const DEFAULT_UPLOAD_MAX_MB = 8;
export const DEFAULT_UPLOAD_BATCH_MAX = 30;
export const DEFAULT_UPLOAD_HOUR_LIMIT = null;
export const DEFAULT_UPLOAD_DAY_LIMIT = null;
export const DEFAULT_INVITE_HOUR_LIMIT = null;
export const DEFAULT_INVITE_DAY_LIMIT = null;
export const DEFAULT_UPLOADS_ENABLED = true;
export const DEFAULT_REGISTRATIONS_ENABLED = true;
const MAX_STORAGE_UPLOAD_MB = 8;
const MAX_UPLOAD_BATCH_MAX = 100;
const MAX_UPLOAD_RATE_LIMIT = 1000;

function settingMap(rows) {
  return new Map((rows ?? []).map((row) => [row.key, row.value]));
}

function normalizeUploadMaxMb(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_UPLOAD_MAX_MB;
  return Math.min(MAX_STORAGE_UPLOAD_MB, Math.max(1, Math.floor(parsed)));
}

function normalizeUploadBatchMax(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_UPLOAD_BATCH_MAX;
  return Math.min(MAX_UPLOAD_BATCH_MAX, Math.max(1, Math.floor(parsed)));
}

function normalizeUploadRateLimit(value) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(MAX_UPLOAD_RATE_LIMIT, Math.max(1, Math.floor(parsed)));
}

function normalizeUploadsEnabled(value) {
  return value !== false;
}

function normalizeRegistrationsEnabled(value) {
  return value !== false;
}

export function useSiteSettings(user) {
  const [settings, setSettings] = useState({
    tagPresets: defaultTagPresets,
    uploadMaxMb: DEFAULT_UPLOAD_MAX_MB,
    uploadBatchMax: DEFAULT_UPLOAD_BATCH_MAX,
    uploadHourLimit: DEFAULT_UPLOAD_HOUR_LIMIT,
    uploadDayLimit: DEFAULT_UPLOAD_DAY_LIMIT,
    inviteHourLimit: DEFAULT_INVITE_HOUR_LIMIT,
    inviteDayLimit: DEFAULT_INVITE_DAY_LIMIT,
    uploadsEnabled: DEFAULT_UPLOADS_ENABLED,
    registrationsEnabled: DEFAULT_REGISTRATIONS_ENABLED,
  });
  const [loadingSettings, setLoadingSettings] = useState(hasSupabaseConfig);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const uploadMaxBytes = useMemo(
    () => settings.uploadMaxMb * 1024 * 1024,
    [settings.uploadMaxMb],
  );

  const loadSettings = useCallback(async () => {
    if (!supabase) {
      setLoadingSettings(false);
      return;
    }

    setLoadingSettings(true);
    setSettingsError('');

    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value');

      if (error) throw error;

      const values = settingMap(data);
      setSettings({
        tagPresets: normalizeTags(values.get('tag_presets') ?? defaultTagPresets),
        uploadMaxMb: normalizeUploadMaxMb(values.get('upload_max_mb')),
        uploadBatchMax: normalizeUploadBatchMax(values.get('upload_batch_max')),
        uploadHourLimit: normalizeUploadRateLimit(values.get('upload_hour_limit')),
        uploadDayLimit: normalizeUploadRateLimit(values.get('upload_day_limit')),
        inviteHourLimit: normalizeUploadRateLimit(values.get('invite_hour_limit')),
        inviteDayLimit: normalizeUploadRateLimit(values.get('invite_day_limit')),
        uploadsEnabled: normalizeUploadsEnabled(values.get('uploads_enabled')),
        registrationsEnabled: normalizeRegistrationsEnabled(values.get('registrations_enabled')),
      });
    } catch {
      setSettingsError('无法读取站点设置，已使用本地默认值。');
      setSettings({
        tagPresets: defaultTagPresets,
        uploadMaxMb: DEFAULT_UPLOAD_MAX_MB,
        uploadBatchMax: DEFAULT_UPLOAD_BATCH_MAX,
        uploadHourLimit: DEFAULT_UPLOAD_HOUR_LIMIT,
        uploadDayLimit: DEFAULT_UPLOAD_DAY_LIMIT,
        inviteHourLimit: DEFAULT_INVITE_HOUR_LIMIT,
        inviteDayLimit: DEFAULT_INVITE_DAY_LIMIT,
        uploadsEnabled: DEFAULT_UPLOADS_ENABLED,
        registrationsEnabled: DEFAULT_REGISTRATIONS_ENABLED,
      });
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async ({
    tagPresets,
    uploadMaxMb,
    uploadBatchMax,
    uploadHourLimit,
    uploadDayLimit,
    inviteHourLimit,
    inviteDayLimit,
    uploadsEnabled,
    registrationsEnabled,
  }) => {
    if (!supabase) {
      throw new Error('当前为预览模式，无法保存站点设置。');
    }
    if (!user) {
      throw new Error('请先登录管理员账号。');
    }

    const nextTagPresets = normalizeTags(tagPresets);
    const nextUploadMaxMb = normalizeUploadMaxMb(uploadMaxMb);
    const nextUploadBatchMax = normalizeUploadBatchMax(uploadBatchMax);
    const nextUploadHourLimit = normalizeUploadRateLimit(uploadHourLimit);
    const nextUploadDayLimit = normalizeUploadRateLimit(uploadDayLimit);
    const nextInviteHourLimit = normalizeUploadRateLimit(inviteHourLimit);
    const nextInviteDayLimit = normalizeUploadRateLimit(inviteDayLimit);
    const nextUploadsEnabled = normalizeUploadsEnabled(uploadsEnabled);
    const nextRegistrationsEnabled = normalizeRegistrationsEnabled(registrationsEnabled);

    if (!nextTagPresets.length) {
      throw new Error('至少保留一个预设标签。');
    }

    setSavingSettings(true);
    setSettingsError('');

    try {
      const { error } = await supabase.from('site_settings').upsert(
        [
          {
            key: 'tag_presets',
            value: nextTagPresets,
            updated_by: user.id,
          },
          {
            key: 'upload_max_mb',
            value: nextUploadMaxMb,
            updated_by: user.id,
          },
          {
            key: 'upload_batch_max',
            value: nextUploadBatchMax,
            updated_by: user.id,
          },
          {
            key: 'upload_hour_limit',
            value: nextUploadHourLimit,
            updated_by: user.id,
          },
          {
            key: 'upload_day_limit',
            value: nextUploadDayLimit,
            updated_by: user.id,
          },
          {
            key: 'invite_hour_limit',
            value: nextInviteHourLimit,
            updated_by: user.id,
          },
          {
            key: 'invite_day_limit',
            value: nextInviteDayLimit,
            updated_by: user.id,
          },
          {
            key: 'uploads_enabled',
            value: nextUploadsEnabled,
            updated_by: user.id,
          },
          {
            key: 'registrations_enabled',
            value: nextRegistrationsEnabled,
            updated_by: user.id,
          },
        ],
        { onConflict: 'key' },
      );

      if (error) throw error;

      setSettings({
        tagPresets: nextTagPresets,
        uploadMaxMb: nextUploadMaxMb,
        uploadBatchMax: nextUploadBatchMax,
        uploadHourLimit: nextUploadHourLimit,
        uploadDayLimit: nextUploadDayLimit,
        inviteHourLimit: nextInviteHourLimit,
        inviteDayLimit: nextInviteDayLimit,
        uploadsEnabled: nextUploadsEnabled,
        registrationsEnabled: nextRegistrationsEnabled,
      });
    } catch {
      throw new Error('保存失败，请确认当前账号仍是管理员。');
    } finally {
      setSavingSettings(false);
    }
  };

  return {
    settings,
    uploadMaxBytes,
    loadingSettings,
    savingSettings,
    settingsError,
    refreshSettings: loadSettings,
    saveSettings,
  };
}

import { useEffect, useState } from 'react';
import { normalizeTags, tagsToText } from '../../lib/tags.js';

function valueOrEmpty(value) {
  return value ?? '';
}

export function useAdminSettingsForm(settings) {
  const [tagText, setTagText] = useState(tagsToText(settings?.tagPresets ?? []));
  const [uploadMaxMb, setUploadMaxMb] = useState(settings?.uploadMaxMb ?? 8);
  const [uploadBatchMax, setUploadBatchMax] = useState(settings?.uploadBatchMax ?? 30);
  const [uploadHourLimit, setUploadHourLimit] = useState(valueOrEmpty(settings?.uploadHourLimit));
  const [uploadDayLimit, setUploadDayLimit] = useState(valueOrEmpty(settings?.uploadDayLimit));
  const [inviteHourLimit, setInviteHourLimit] = useState(valueOrEmpty(settings?.inviteHourLimit));
  const [inviteDayLimit, setInviteDayLimit] = useState(valueOrEmpty(settings?.inviteDayLimit));
  const [uploadsEnabled, setUploadsEnabled] = useState(settings?.uploadsEnabled !== false);
  const [registrationsEnabled, setRegistrationsEnabled] = useState(settings?.registrationsEnabled !== false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setTagText(tagsToText(settings?.tagPresets ?? []));
    setUploadMaxMb(settings?.uploadMaxMb ?? 8);
    setUploadBatchMax(settings?.uploadBatchMax ?? 30);
    setUploadHourLimit(valueOrEmpty(settings?.uploadHourLimit));
    setUploadDayLimit(valueOrEmpty(settings?.uploadDayLimit));
    setInviteHourLimit(valueOrEmpty(settings?.inviteHourLimit));
    setInviteDayLimit(valueOrEmpty(settings?.inviteDayLimit));
    setUploadsEnabled(settings?.uploadsEnabled !== false);
    setRegistrationsEnabled(settings?.registrationsEnabled !== false);
  }, [settings]);

  const clearMessage = () => setMessage('');

  const payload = () => ({
    tagPresets: normalizeTags(tagText),
    uploadMaxMb,
    uploadBatchMax,
    uploadHourLimit,
    uploadDayLimit,
    inviteHourLimit,
    inviteDayLimit,
    uploadsEnabled,
    registrationsEnabled,
  });

  return {
    tagText,
    setTagText,
    uploadMaxMb,
    setUploadMaxMb,
    uploadBatchMax,
    setUploadBatchMax,
    uploadHourLimit,
    setUploadHourLimit,
    uploadDayLimit,
    setUploadDayLimit,
    inviteHourLimit,
    setInviteHourLimit,
    inviteDayLimit,
    setInviteDayLimit,
    uploadsEnabled,
    setUploadsEnabled,
    registrationsEnabled,
    setRegistrationsEnabled,
    message,
    setMessage,
    clearMessage,
    payload,
  };
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildUploadDraftSummary, buildUploadProgressModel } from './uploadDraftModel.js';
import { selectionEntries } from './uploadUtils.js';

export function useUploadDraftSelection({ uploadBatchMax = 30, uploadMaxBytes = null }) {
  const [entries, setEntries] = useState([]);
  const entriesRef = useRef([]);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => () => {
    entriesRef.current.forEach((entry) => {
      if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
    });
  }, []);

  const draftSummary = useMemo(() => buildUploadDraftSummary(entries), [entries]);
  const progressModel = useMemo(() => buildUploadProgressModel(entries), [entries]);

  const replaceSelection = (files) => {
    const batchLimit = Math.max(1, Math.floor(Number(uploadBatchMax) || 30));
    const accepted = files.slice(0, batchLimit);

    entriesRef.current.forEach((entry) => {
      if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
    });

    setEntries(selectionEntries(accepted, {
      maxFileSize: uploadMaxBytes,
      createPreviewUrl: (file) => URL.createObjectURL(file),
    }));

    return {
      selectedCount: files.length,
      acceptedCount: accepted.length,
      batchLimit,
      truncated: files.length > batchLimit,
    };
  };

  const updateEntry = (id, patch) => {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  };

  const removeEntry = (id) => {
    setEntries((current) => {
      const removed = current.find((entry) => entry.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((entry) => entry.id !== id);
    });
  };

  const pendingEntries = () =>
    entriesRef.current.filter((entry) => entry.status !== 'success' && !entry.localIssue);

  return {
    entries,
    draftSummary,
    progressModel,
    replaceSelection,
    updateEntry,
    removeEntry,
    pendingEntries,
  };
}

import { useState } from 'react';
import { StatusNotice } from '../../components/StatusNotice.jsx';
import { defaultTagPresets, normalizeTags } from '../../lib/tags.js';
import {
  uploadDraftBlockedNotice,
  errorNotice,
  previewModeNotice,
  uploadPendingNotice,
  uploadResultNotice,
  uploadSelectionLimitNotice,
} from '../../lib/userFeedback.js';
import { UploadBatchList } from './UploadBatchList.jsx';
import { UploadProgressMeter } from './UploadProgressMeter.jsx';
import { UploadTagSuggestions } from './UploadTagSuggestions.jsx';
import { buildUploadDraftSummary } from './uploadDraftModel.js';
import { useUploadDraftSelection } from './useUploadDraftSelection.js';

export function UploadModal({
  uploading,
  connected,
  tagPresets = defaultTagPresets,
  uploadMaxMb = 8,
  uploadBatchMax = 30,
  uploadHourLimit = null,
  uploadDayLimit = null,
  isAdmin = false,
  onClose,
  onSubmit,
}) {
  const [caption, setCaption] = useState('');
  const [tagText, setTagText] = useState('');
  const [notice, setNotice] = useState(null);
  const uploadMaxBytes = uploadMaxMb * 1024 * 1024;
  const {
    entries,
    draftSummary,
    progressModel,
    replaceSelection: replaceDraftSelection,
    updateEntry,
    removeEntry,
    pendingEntries,
  } = useUploadDraftSelection({ uploadBatchMax, uploadMaxBytes });

  const replaceSelection = (event) => {
    const files = Array.from(event.target.files ?? []);
    const selection = replaceDraftSelection(files);
    setNotice(selection.truncated ? uploadSelectionLimitNotice(selection.batchLimit) : null);
    event.target.value = '';
  };

  const uploadRateHint = [
    typeof uploadHourLimit === 'number' ? `每小时最多 ${uploadHourLimit} 张` : null,
    typeof uploadDayLimit === 'number' ? `每日最多 ${uploadDayLimit} 张` : null,
  ].filter(Boolean).join('，');

  const submit = async (event) => {
    event.preventDefault();
    setNotice(null);
    const currentSummary = buildUploadDraftSummary(entries);

    if (currentSummary.hasLocalBlockers) {
      setNotice(uploadDraftBlockedNotice(currentSummary));
      return;
    }

    const pending = pendingEntries();

    if (!pending.length) {
      setNotice(uploadPendingNotice(entries.length > 0));
      return;
    }

    let results;
    try {
      results = await onSubmit({
        entries: pending,
        caption,
        tags: normalizeTags(tagText),
        onProgress: updateEntry,
      });
    } catch (error) {
      setNotice(errorNotice(error.message));
      return;
    }
    const failed = results.filter((result) => !result.success);

    if (failed.length === 0) {
      onClose();
      return;
    }

    const succeeded = results.length - failed.length;
    setNotice(uploadResultNotice({ succeeded, failed: failed.length }));
  };

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={uploading ? undefined : onClose}
    >
      <section
        className="modal upload-modal glass-panel screentone-shadow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="notebook-wire-rings" aria-hidden="true">
          <span className="ring-item" />
          <span className="ring-item" />
          <span className="ring-item" />
          <span className="ring-item" />
          <span className="ring-item" />
          <span className="ring-item" />
          <span className="ring-item" />
          <span className="ring-item" />
        </div>
        <button className="modal-close" onClick={onClose} aria-label="关闭" disabled={uploading}>
          ×
        </button>
        <p className="eyebrow">NEW MEMORIES</p>
        <h2 id="upload-title">批量刻录记忆</h2>
        {!connected && (
          <StatusNotice
            notice={previewModeNotice('当前页面可预览效果', '配置 Supabase 项目后即可真实上传。')}
          />
        )}
        <form className="memory-form" onSubmit={submit}>
          <label>
            共同记录
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="可选：为本批图片留下一句共同描述"
              rows="2"
              disabled={uploading}
            />
          </label>
          <label>
            标签
            <input
              type="text"
              value={tagText}
              onChange={(event) => setTagText(event.target.value)}
              placeholder="例如：ATRI，背景，生成图"
              disabled={uploading}
            />
          </label>
          <UploadTagSuggestions
            tagPresets={tagPresets}
            tagText={tagText}
            uploading={uploading}
            onChange={setTagText}
          />
          <label className="file-drop batch-drop">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={replaceSelection}
              disabled={uploading}
            />
            <span className="file-icon">＋</span>
            <strong>{entries.length ? `已选择 ${entries.length} 张图像` : '选择多张图像'}</strong>
            <small>PNG / JPEG / WEBP / GIF，每张最多 {uploadMaxMb} MB，单次最多 {uploadBatchMax} 张</small>
            {uploadRateHint && !isAdmin && (
              <small>普通用户当前限制：{uploadRateHint}</small>
            )}
          </label>
          <div className="upload-draft-summary" aria-live="polite">
            <strong>{draftSummary.label}</strong>
            <span>
              {draftSummary.blocked > 0
                ? '请先移除不符合规则的文件'
                : draftSummary.saved > 0
                  ? `已保存 ${draftSummary.saved} 张`
                  : draftSummary.failed > 0
                    ? `失败待重试 ${draftSummary.failed} 张`
                    : draftSummary.uploading > 0
                      ? `正在保存 ${draftSummary.uploading} 张`
                      : '保存前可逐张检查缩略图和标题'}
            </span>
          </div>
          <UploadProgressMeter progress={progressModel} />
          <UploadBatchList
            entries={entries}
            uploading={uploading}
            onUpdateEntry={updateEntry}
            onRemoveEntry={removeEntry}
          />
          <StatusNotice notice={notice} />
          <div className="modal-actions">
            <button className="ghost-button" type="button" onClick={onClose} disabled={uploading}>
              返回
            </button>
            <button className="primary-button" type="submit" disabled={uploading}>
              {uploading
                ? '批量存入中...'
                : draftSummary.hasLocalBlockers
                  ? '处理无法上传项'
                : entries.some((entry) => entry.status === 'error')
                  ? '重试失败项'
                  : '批量保存'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

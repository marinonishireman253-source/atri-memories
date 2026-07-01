import { uploadFileSizeLabel } from './uploadDraftModel.js';
import { uploadStatusLabel } from './uploadUtils.js';

export function UploadBatchList({ entries, uploading, onUpdateEntry, onRemoveEntry }) {
  if (!entries.length) return null;

  return (
    <div className="batch-list" aria-label="待上传图片列表">
      {entries.map((entry) => (
        <div className={`batch-item ${entry.status}`} key={entry.id}>
          <div className="batch-preview">
            {entry.previewUrl ? (
              <img src={entry.previewUrl} alt="" loading="lazy" decoding="async" />
            ) : (
              <span aria-hidden="true">IMG</span>
            )}
          </div>
          <div className="batch-item-head">
            <span className={`upload-status ${entry.status}`}>
              {uploadStatusLabel(entry.status)}
            </span>
            <span className="file-name" title={entry.file.name}>
              {entry.file.name}
            </span>
            <span className="file-size">{uploadFileSizeLabel(entry.file.size)}</span>
            {entry.status !== 'success' && (
              <button
                className="remove-file"
                type="button"
                disabled={uploading}
                onClick={() => onRemoveEntry(entry.id)}
                aria-label={`移除 ${entry.file.name}`}
              >
                移除
              </button>
            )}
          </div>
          <input
            aria-label={`${entry.file.name} 的标题`}
            required
            value={entry.title}
            onChange={(event) => onUpdateEntry(entry.id, { title: event.target.value })}
            placeholder="图片标题"
            disabled={uploading || entry.status === 'success' || entry.localIssue}
          />
          {entry.error && <p className="item-error">{entry.error}</p>}
        </div>
      ))}
    </div>
  );
}

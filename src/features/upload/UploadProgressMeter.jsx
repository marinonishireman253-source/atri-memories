export function UploadProgressMeter({ progress }) {
  if (!progress?.total) return null;

  return (
    <div className={`upload-progress-meter ${progress.tone}`} aria-label="上传批次进度">
      <div className="upload-progress-head">
        <strong>{progress.label}</strong>
        <span>{progress.percent}%</span>
      </div>
      <div
        className="upload-progress-track"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={progress.percent}
        aria-label={progress.label}
      >
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      <p>{progress.detail}</p>
    </div>
  );
}

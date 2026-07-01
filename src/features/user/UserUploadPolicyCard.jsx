export function UserUploadPolicyCard({ model, uploadDisabled, onOpenUpload }) {
  if (!model) return null;

  return (
    <div className={`user-tags-card user-upload-policy-card ${model.tone}`}>
      <div className="user-card-title">
        <h3>上传权限</h3>
        <span className={`scope-pill ${model.allowsUpload ? 'active' : ''}`}>
          {model.isAdmin ? '管理员' : model.allowsUpload ? '可上传' : '受限'}
        </span>
      </div>
      <p className="user-scope-description">
        <strong>{model.headline}</strong>
        <span>{model.detail}</span>
      </p>
      <div className="upload-policy-grid" aria-label="上传额度和限速">
        {model.items.map((item) => (
          <div className={`upload-policy-item ${item.tone}`} key={item.key}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </div>
        ))}
      </div>
      <div className="scope-actions">
        <button
          className="ghost-button compact"
          type="button"
          onClick={onOpenUpload}
          disabled={uploadDisabled || !model.allowsUpload}
        >
          打开上传
        </button>
      </div>
    </div>
  );
}

export function UserProfileForm({
  user,
  displayName,
  bio,
  savingProfile,
  onDisplayNameChange,
  onBioChange,
  onCancel,
  onSubmit,
}) {
  return (
    <form className="profile-form" onSubmit={onSubmit}>
      <label>
        显示名
        <input
          type="text"
          value={displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          maxLength="40"
          placeholder={user.email ?? '当前用户'}
          disabled={savingProfile}
        />
      </label>
      <label>
        简介
        <textarea
          value={bio}
          onChange={(event) => onBioChange(event.target.value)}
          maxLength="160"
          rows="3"
          placeholder="可选：写一句这个相册的说明"
          disabled={savingProfile}
        />
      </label>
      <div className="profile-actions">
        <button className="ghost-button" type="button" onClick={onCancel} disabled={savingProfile}>
          取消
        </button>
        <button className="primary-button" type="submit" disabled={savingProfile}>
          {savingProfile ? '保存中...' : '保存资料'}
        </button>
      </div>
    </form>
  );
}

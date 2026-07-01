export function AuthSecondaryActions({
  registrationsEnabled,
  labels,
  submitting,
  onToggleMode,
  onSendReset,
  onResendConfirmation,
}) {
  return (
    <>
      {registrationsEnabled ? (
        <button className="text-button" type="button" onClick={onToggleMode}>
          {labels.toggleLabel}
        </button>
      ) : (
        <button className="text-button" type="button" onClick={onToggleMode} disabled>
          当前未开放公开注册
        </button>
      )}
      <div className="auth-secondary-actions">
        <button className="text-button inline" type="button" onClick={onSendReset} disabled={submitting}>
          忘记密码
        </button>
        <button className="text-button inline" type="button" onClick={onResendConfirmation} disabled={submitting}>
          重发确认邮件
        </button>
      </div>
    </>
  );
}

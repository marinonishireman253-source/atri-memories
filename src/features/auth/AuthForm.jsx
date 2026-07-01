export function AuthForm({
  mode,
  labels,
  email,
  password,
  submitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}) {
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <label>
        邮箱
        <input
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </label>
      <label>
        密码
        <input
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="至少 6 位"
          minLength="6"
          required
        />
      </label>
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? labels.submittingLabel : labels.submitLabel}
      </button>
    </form>
  );
}

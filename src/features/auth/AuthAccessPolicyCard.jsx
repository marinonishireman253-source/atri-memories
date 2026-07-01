export function AuthAccessPolicyCard({ policy }) {
  if (!policy) return null;

  return (
    <section className={`auth-policy-card ${policy.tone}`} aria-label="账号入口策略">
      <span>{policy.label}</span>
      <strong>{policy.title}</strong>
      <p>{policy.detail}</p>
    </section>
  );
}

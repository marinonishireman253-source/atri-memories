export function AdminDisclosureSection({
  title,
  summary,
  children,
  defaultOpen = false,
  tone = 'default',
}) {
  return (
    <details className={`admin-disclosure ${tone}`} open={defaultOpen}>
      <summary>
        <div>
          <strong>{title}</strong>
          {summary ? <p>{summary}</p> : null}
        </div>
        <span className="admin-disclosure-toggle">查看详情</span>
      </summary>
      <div className="admin-disclosure-body">
        {children}
      </div>
    </details>
  );
}

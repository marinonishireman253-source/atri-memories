export function UserSummaryStats({ stats }) {
  return (
    <div className="user-summary-grid" aria-label="个人相册统计">
      {stats.map((item) => (
        <div key={item.key}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.detail}</small>
        </div>
      ))}
    </div>
  );
}

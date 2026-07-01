export function ViewerInfoGrid({ items }) {
  if (!items?.length) return null;

  return (
    <dl className="viewer-info-grid" aria-label="图片信息摘要">
      {items.map((item) => (
        <div className="viewer-info-item" key={item.key}>
          <dt>{item.label}</dt>
          <dd title={item.value}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

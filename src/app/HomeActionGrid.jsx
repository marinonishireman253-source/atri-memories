export function HomeActionGrid({ items }) {
  if (!items?.length) {
    return null;
  }

  return (
    <section className="home-actions glass-panel" aria-label="首页主操作">
      <div className="section-head">
        <div>
          <p className="eyebrow">START HERE</p>
          <h2>
            <span className="section-accent" aria-hidden="true" />
            快速进入主要功能
          </h2>
        </div>
      </div>
      <div className={`home-actions-grid ${items.length === 1 ? 'single' : ''}`}>
        {items.map((item) => (
          <article className={`home-action-card ${item.tone ?? 'default'}`} key={item.key}>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
            <button
              className={item.tone === 'primary' ? 'primary-button compact' : 'ghost-button compact'}
              type="button"
              onClick={item.onAction}
              disabled={item.disabled}
              title={item.disabled ? item.detail : undefined}
            >
              {item.actionLabel}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

import { StatusNotice } from '../components/StatusNotice.jsx';

export function HomeStatusStack({ items }) {
  if (!items?.length) {
    return null;
  }

  return (
    <div className="home-status-stack" aria-label="首页状态提示">
      {items.map((item) => (
        <div className="home-status-item" key={item.id}>
          <StatusNotice notice={item.notice} />
          {(item.actionLabel || item.dismissible) && (
            <div className="home-status-actions">
              {item.actionLabel && (
                <button className="text-button inline" type="button" onClick={item.onAction}>
                  {item.actionLabel}
                </button>
              )}
              {item.dismissible && (
                <button className="text-button inline" type="button" onClick={item.onDismiss}>
                  收起
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

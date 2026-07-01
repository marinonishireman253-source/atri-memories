export function ViewerLinkActions({ actions, busy, onCopy }) {
  if (!actions?.length) return null;

  return (
    <div className="viewer-link-actions" aria-label="复制链接">
      {actions.map((action) => (
        <button
          className="edit-button"
          type="button"
          key={action.key}
          onClick={() => onCopy(action)}
          disabled={busy || !action.url}
          title={action.url ? action.description : '当前链接不可用'}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

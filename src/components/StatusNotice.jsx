function noticeRole(tone) {
  return tone === 'error' ? 'alert' : 'status';
}

function iconKind(icon) {
  if (icon === 'i') return 'info';
  if (icon === '!') return 'warning';
  if (icon === 'OK') return 'success';
  return 'custom';
}

function iconLabel(icon) {
  if (icon === 'i') return '';
  if (icon === '!') return '!';
  if (icon === 'OK') return '✓';
  return icon;
}

export function StatusNotice({ notice, className = '' }) {
  if (!notice?.title && !notice?.body) {
    return null;
  }

  const classes = ['status-notice', 'page-fold', notice.tone, notice.icon ? 'has-icon' : '', notice.compact ? 'compact' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role={noticeRole(notice.tone)} aria-live="polite">
      {notice.icon && (
        <span className="status-notice-icon" data-icon={iconKind(notice.icon)} aria-hidden="true">
          {iconLabel(notice.icon)}
        </span>
      )}
      <div className="status-notice-content">
        {notice.title && <p className="status-notice-title">{notice.title}</p>}
        {notice.body && <p className="status-notice-body">{notice.body}</p>}
      </div>
    </div>
  );
}

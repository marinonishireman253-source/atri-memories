export function AdminPanelMessages({
  activeTab,
  message,
  confirmingDelete,
  downloadProgress,
  overviewError,
  adminMemoryError,
  userError,
  reportError,
  logError,
  settingsError,
  settingsMessage,
}) {
  return (
    <>
      {message && <p className={`admin-message ${confirmingDelete ? 'warning' : ''}`}>{message}</p>}
      {downloadProgress && (
        <p className="admin-message">
          {downloadProgress.phase === 'zipping'
            ? '正在打包 ZIP...'
            : `正在读取图片 ${downloadProgress.current} / ${downloadProgress.total}：${downloadProgress.title}`}
        </p>
      )}
      {activeTab === 'overview' && overviewError && <p className="admin-message warning">{overviewError}</p>}
      {activeTab === 'images' && adminMemoryError && <p className="admin-message warning">{adminMemoryError}</p>}
      {activeTab === 'users' && userError && <p className="admin-message warning">{userError}</p>}
      {activeTab === 'reports' && reportError && <p className="admin-message warning">{reportError}</p>}
      {activeTab === 'logs' && logError && <p className="admin-message warning">{logError}</p>}
      {activeTab === 'settings' && settingsError && <p className="admin-message warning">{settingsError}</p>}
      {activeTab === 'settings' && settingsMessage && (
        <p className={`admin-message ${settingsMessage.includes('失败') ? 'warning' : ''}`}>
          {settingsMessage}
        </p>
      )}
    </>
  );
}

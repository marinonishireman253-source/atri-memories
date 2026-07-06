import {
  SettingsAuthReminder,
  SettingsFields,
  SettingsLaunchReadiness,
  SettingsOperationsPanel,
  SettingsTagPreview,
} from './AdminSettingsSections.jsx';

export function AdminSettingsTab({
  loadingSettings,
  savingSettings,
  settingsTagText,
  onSettingsTagTextChange,
  settingsUploadMaxMb,
  onSettingsUploadMaxMbChange,
  settingsUploadBatchMax,
  onSettingsUploadBatchMaxChange,
  settingsUploadHourLimit,
  onSettingsUploadHourLimitChange,
  settingsUploadDayLimit,
  onSettingsUploadDayLimitChange,
  settingsInviteHourLimit,
  onSettingsInviteHourLimitChange,
  settingsInviteDayLimit,
  onSettingsInviteDayLimitChange,
  settingsUploadsEnabled,
  onSettingsUploadsEnabledChange,
  settingsRegistrationsEnabled,
  onSettingsRegistrationsEnabledChange,
  overviewSummary,
  currentOrigin,
  onOpenOverviewTab,
  onOpenUsersTab,
  onOpenReportsTab,
  onOpenImagesTab,
  onRefreshSettings,
  onSubmit,
}) {
  const tabActions = {
    overview: onOpenOverviewTab,
    users: onOpenUsersTab,
    reports: onOpenReportsTab,
    images: onOpenImagesTab,
    settings: undefined,
  };
  const sharedSettings = {
    overviewSummary,
    currentOrigin,
    settingsRegistrationsEnabled,
    settingsUploadMaxMb,
    settingsUploadBatchMax,
    settingsUploadHourLimit,
    settingsUploadDayLimit,
    settingsInviteHourLimit,
    settingsInviteDayLimit,
    settingsUploadsEnabled,
    tabActions,
  };

  return (
    <form className="user-admin-panel settings-panel" onSubmit={onSubmit}>
      <p className="admin-help-text">
        这里管理会影响全站的轻量配置。单张图片上传上限不能超过当前站点限制 8 MB。
      </p>
      <SettingsFields
        loadingSettings={loadingSettings}
        savingSettings={savingSettings}
        settingsTagText={settingsTagText}
        onSettingsTagTextChange={onSettingsTagTextChange}
        settingsUploadMaxMb={settingsUploadMaxMb}
        onSettingsUploadMaxMbChange={onSettingsUploadMaxMbChange}
        settingsUploadBatchMax={settingsUploadBatchMax}
        onSettingsUploadBatchMaxChange={onSettingsUploadBatchMaxChange}
        settingsUploadHourLimit={settingsUploadHourLimit}
        onSettingsUploadHourLimitChange={onSettingsUploadHourLimitChange}
        settingsUploadDayLimit={settingsUploadDayLimit}
        onSettingsUploadDayLimitChange={onSettingsUploadDayLimitChange}
        settingsInviteHourLimit={settingsInviteHourLimit}
        onSettingsInviteHourLimitChange={onSettingsInviteHourLimitChange}
        settingsInviteDayLimit={settingsInviteDayLimit}
        onSettingsInviteDayLimitChange={onSettingsInviteDayLimitChange}
        settingsUploadsEnabled={settingsUploadsEnabled}
        onSettingsUploadsEnabledChange={onSettingsUploadsEnabledChange}
        settingsRegistrationsEnabled={settingsRegistrationsEnabled}
        onSettingsRegistrationsEnabledChange={onSettingsRegistrationsEnabledChange}
      />
      <SettingsTagPreview settingsTagText={settingsTagText} />
      <SettingsLaunchReadiness {...sharedSettings} />
      <SettingsAuthReminder
        currentOrigin={currentOrigin}
        settingsRegistrationsEnabled={settingsRegistrationsEnabled}
      />
      <SettingsOperationsPanel {...sharedSettings} />
      <div className="admin-actions settings-actions">
        <button className="ghost-button compact" type="button" onClick={onRefreshSettings} disabled={loadingSettings || savingSettings}>
          {loadingSettings ? '刷新中...' : '恢复已保存'}
        </button>
        <button className="primary-button compact" type="submit" disabled={loadingSettings || savingSettings}>
          {savingSettings ? '保存中...' : '保存设置'}
        </button>
      </div>
    </form>
  );
}

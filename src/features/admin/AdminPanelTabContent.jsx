import { AdminLogsTab } from './AdminLogsTab.jsx';
import { AdminImagesTab } from './AdminImagesTab.jsx';
import { AdminOverviewTab } from './AdminOverviewTab.jsx';
import { AdminReportsTab } from './AdminReportsTab.jsx';
import { AdminSettingsTab } from './AdminSettingsTab.jsx';
import { AdminUsersTab } from './AdminUsersTab.jsx';

export function AdminPanelTabContent({
  activeTab,
  overviewProps,
  imagesProps,
  usersProps,
  reportsProps,
  logsProps,
  settingsProps,
}) {
  if (activeTab === 'overview') {
    return <AdminOverviewTab {...overviewProps} />;
  }

  if (activeTab === 'images') {
    return <AdminImagesTab {...imagesProps} />;
  }

  if (activeTab === 'users') {
    return <AdminUsersTab {...usersProps} />;
  }

  if (activeTab === 'reports') {
    return <AdminReportsTab {...reportsProps} />;
  }

  if (activeTab === 'logs') {
    return <AdminLogsTab {...logsProps} />;
  }

  return <AdminSettingsTab {...settingsProps} />;
}

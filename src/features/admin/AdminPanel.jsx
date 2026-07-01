import { useEffect, useMemo, useState } from 'react';
import { AdminChrome } from './AdminChrome.jsx';
import { AdminPanelMessages } from './AdminPanelMessages.jsx';
import { AdminPanelTabContent } from './AdminPanelTabContent.jsx';
import { useAdminPanelFilters } from './useAdminPanelFilters.js';
import { useAdminMemorySelection } from './useAdminMemorySelection.js';
import { useAdminSettingsForm } from './useAdminSettingsForm.js';
import {
  statusMessage,
} from './adminFormatters.js';
import { useAdminMemories } from '../../hooks/useAdminMemories.js';
import { useAdminOverview } from '../../hooks/useAdminOverview.js';
import { useAdminUsers } from '../../hooks/useAdminUsers.js';
import { useAuditLogs } from '../../hooks/useAuditLogs.js';
import { useReports } from '../../hooks/useReports.js';
import { downloadMemoriesZip } from '../../lib/zipDownloads.js';

export function AdminPanel({
  variant = 'modal',
  deleting,
  onClose,
  onOpenMemory,
  onFilterOwner,
  onDeleteMany,
  settings,
  loadingSettings,
  savingSettings,
  settingsError,
  onRefreshSettings,
  onSaveSettings,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const settingsForm = useAdminSettingsForm(settings);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [message, setMessage] = useState('');
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const {
    users,
    invitePolicy,
    loadingUsers,
    mutatingUser,
    invitingUser,
    userError,
    loadUsers,
    setAdmin,
    setUploadPolicy,
    setUploadLimit,
    inviteUser,
  } = useAdminUsers();
  const {
    logs,
    loadingLogs,
    logError,
    loadLogs,
  } = useAuditLogs();
  const {
    reports,
    loadingReports,
    mutatingReport,
    reportError,
    loadReports,
    updateReport,
  } = useReports();
  const {
    memories: adminMemories,
    filters: adminFilters,
    loading: loadingAdminMemories,
    loadingMore: loadingMoreAdminMemories,
    error: adminMemoryError,
    hasMore: adminHasMore,
    totalCount: adminTotalCount,
    stats: adminStats,
    backfillingSizes,
    backfillingThumbnails,
    refresh: refreshAdminMemories,
    loadMore: loadMoreAdminMemories,
    updateFilters: updateAdminFilters,
    setOwnerFilter: setAdminOwnerFilter,
    clearOwnerFilter: clearAdminOwnerFilter,
    backfillSizes,
    backfillThumbnails,
  } = useAdminMemories();
  const {
    selectedIds,
    selectedMemories,
    confirmingDelete,
    setConfirmingDelete,
    toggleMemory: toggleSelectedMemory,
    selectVisible,
    clearSelection: clearSelectedMemories,
    removeSelectedIds,
  } = useAdminMemorySelection(adminMemories);
  const {
    overview,
    loadingOverview,
    overviewError,
    loadOverview,
  } = useAdminOverview();
  const {
    userQuery,
    setUserQuery,
    userSegment,
    setUserSegment,
    inviteEmail,
    setInviteEmail,
    reportStatus,
    setReportStatus,
    reportQuery,
    setReportQuery,
    reportReason,
    setReportReason,
    logQuery,
    setLogQuery,
    logAction,
    setLogAction,
    filteredUsers,
    userSegments,
    filteredReports,
    reportQueueSummary,
    filteredLogs,
    logSummary,
  } = useAdminPanelFilters({ users, reports, logs });

  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverview();
    }
    if (activeTab === 'users') {
      loadUsers();
    }
    if (activeTab === 'logs') {
      loadLogs();
    }
    if (activeTab === 'reports') {
      loadReports({ status: reportStatus });
    }
    if (activeTab === 'settings') {
      onRefreshSettings?.();
    }
  }, [activeTab, loadLogs, loadOverview, loadReports, loadUsers, onRefreshSettings, reportStatus]);

  const adminTagOptions = useMemo(() => {
    const tags = new Map();
    const addTag = (value) => {
      const tag = String(value ?? '').trim().slice(0, 24);
      if (!tag) return;
      const key = tag.toLowerCase();
      if (!tags.has(key)) tags.set(key, tag);
    };

    (settings?.tagPresets ?? []).forEach(addTag);
    adminMemories.forEach((memory) => {
      (memory.tags ?? []).forEach(addTag);
    });

    return Array.from(tags.values());
  }, [adminMemories, settings?.tagPresets]);
  const overviewSummary = overview.summary;

  const inviteUserByEmail = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const invited = await inviteUser({ email: inviteEmail });
      setInviteEmail('');
      setMessage(`邀请已发送：${invited?.email ?? '该邮箱'}。`);
      await loadOverview();
      await loadLogs();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const toggleMemory = (id) => {
    toggleSelectedMemory(id);
    setMessage('');
  };

  const selectFiltered = () => {
    selectVisible();
    setMessage('');
  };

  const clearSelection = () => {
    clearSelectedMemories();
    setMessage('');
  };

  const downloadSelected = async () => {
    if (!selectedMemories.length) {
      setMessage('请先选择需要下载的图片。');
      return;
    }

    setDownloading(true);
    setDownloadProgress(null);
    setMessage('');

    try {
      const result = await downloadMemoriesZip(selectedMemories, {
        onProgress: setDownloadProgress,
      });
      setMessage(statusMessage('ZIP 下载', result.succeeded + result.failed, result.failed));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  };

  const deleteSelected = async () => {
    if (!selectedMemories.length) {
      setMessage('请先选择需要删除的图片。');
      return;
    }

    if (!confirmingDelete) {
      setConfirmingDelete(true);
      setMessage(`将删除 ${selectedMemories.length} 张图片。再次点击确认删除。`);
      return;
    }

    setMessage('');
    const results = await onDeleteMany(selectedMemories);
    const failed = results.filter((result) => !result.success).length;
    const deletedIds = new Set(results.filter((result) => result.success).map((result) => result.id));

    removeSelectedIds(deletedIds);
    setMessage(statusMessage('删除', results.length, failed));
    await refreshAdminMemories();
    await loadOverview();
  };

  const saveSiteSettings = async (event) => {
    event.preventDefault();
    settingsForm.setMessage('');

    try {
      await onSaveSettings(settingsForm.payload());
      settingsForm.setMessage('站点设置已保存。');
    } catch (error) {
      settingsForm.setMessage(error.message);
    }
  };

  const backfillUnknownSizes = async () => {
    setMessage('');
    try {
      const result = await backfillSizes();
      setMessage(
        `大小回填完成：处理 ${result.processed ?? 0} 张，成功 ${result.updated ?? 0} 张，失败 ${result.failed ?? 0} 张，剩余未知 ${result.remaining_unknown ?? 0} 张。`,
      );
      await loadOverview();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const backfillMissingThumbnails = async () => {
    setMessage('');
    try {
      const result = await backfillThumbnails();
      setMessage(
        `缩略图回填完成：处理 ${result.processed ?? 0} 张，成功/已存在 ${result.updated ?? 0} 张，失败 ${result.failed ?? 0} 张。`,
      );
      await loadOverview();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleReportDecision = async ({ reportId, status }) => {
    const resolutionNote = window.prompt(
      status === 'open'
        ? '可选：填写重新打开的原因备注。'
        : status === 'resolved'
          ? '可选：填写处理备注，例如已下架、已联系上传者。'
          : '可选：填写驳回原因备注。',
      '',
    );
    if (resolutionNote === null) return;

    await updateReport({
      reportId,
      status,
      resolutionNote,
    });
    await loadReports({ status: reportStatus });
    await loadOverview();
    await loadLogs();
  };

  const busy = deleting || downloading || savingSettings || backfillingSizes || backfillingThumbnails;
  const isPage = variant === 'page';
  const panel = (
    <section
      className={`${isPage ? 'admin-panel admin-page-panel glass-panel' : 'modal admin-panel glass-panel'}`}
      role={isPage ? 'region' : 'dialog'}
      aria-modal={isPage ? undefined : 'true'}
      aria-labelledby="admin-title"
      onMouseDown={isPage ? undefined : (event) => event.stopPropagation()}
    >
      {!isPage && (
        <button className="modal-close" onClick={onClose} aria-label="关闭" disabled={busy}>
          ×
        </button>
      )}
      <p className="eyebrow">ADMIN CONSOLE</p>
      <AdminChrome
        activeTab={activeTab}
        onTabChange={setActiveTab}
        adminMemories={adminMemories}
        adminTotalCount={adminTotalCount}
        adminStats={adminStats}
        selectedMemories={selectedMemories}
      />

      <AdminPanelMessages
        activeTab={activeTab}
        message={message}
        confirmingDelete={confirmingDelete}
        downloadProgress={downloadProgress}
        overviewError={overviewError}
        adminMemoryError={adminMemoryError}
        userError={userError}
        reportError={reportError}
        logError={logError}
        settingsError={settingsError}
        settingsMessage={settingsForm.message}
      />

      <AdminPanelTabContent
        activeTab={activeTab}
        overviewProps={{
            overview,
            overviewSummary,
            loadingOverview,
            currentOrigin,
            onRefresh: loadOverview,
            onOpenMemory,
            onOpenImagesTab: () => setActiveTab('images'),
            onOpenLogsTab: () => setActiveTab('logs'),
            onOpenUsersTab: () => setActiveTab('users'),
            onOpenReportsTab: () => setActiveTab('reports'),
            onOpenSettingsTab: () => setActiveTab('settings'),
          }}
          imagesProps={{
            busy,
            adminFilters,
            onUpdateAdminFilters: updateAdminFilters,
            refreshAdminMemories,
            loadingAdminMemories,
            selectFiltered,
            clearSelection,
            selectedMemories,
            adminMemories,
            tagOptions: adminTagOptions,
            adminStats,
            backfillUnknownSizes,
            backfillingSizes,
            backfillMissingThumbnails,
            backfillingThumbnails,
            downloading,
            downloadSelected,
            confirmingDelete,
            deleteSelected,
            deleting,
            adminHasMore,
            loadMoreAdminMemories,
            loadingMoreAdminMemories,
            toggleMemory,
            selectedIds,
            onOpenMemory,
            clearAdminOwnerFilter,
          }}
          usersProps={{
            userQuery,
            onUserQueryChange: setUserQuery,
            userSegment,
            onUserSegmentChange: setUserSegment,
            userSegments,
            loadingUsers,
            onRefreshUsers: loadUsers,
            inviteEmail,
            onInviteEmailChange: setInviteEmail,
            onInviteSubmit: inviteUserByEmail,
            invitingUser,
            invitePolicy,
            filteredUsers,
            mutatingUser,
            onViewUserImages: (user) => {
              onFilterOwner({ id: user.id, email: user.email });
              setAdminOwnerFilter({ id: user.id, email: user.email });
              setActiveTab('images');
            },
            onToggleAdmin: async (user) => {
              await setAdmin({ userId: user.id, isAdmin: !user.is_admin });
              await loadOverview();
            },
            onToggleUpload: async (user) => {
              await setUploadPolicy({
                userId: user.id,
                canUpload: !user.can_upload,
                uploadLimitTotal: user.upload_limit_total,
              });
              await loadOverview();
            },
            onSetUploadLimit: async (user) => {
              await setUploadLimit({
                userId: user.id,
                currentLimit: user.upload_limit_total,
              });
              await loadOverview();
            },
          }}
          reportsProps={{
            reportStatus,
            onReportStatusChange: setReportStatus,
            reportQuery,
            onReportQueryChange: setReportQuery,
            reportReason,
            onReportReasonChange: setReportReason,
            queueSummary: reportQueueSummary,
            loadingReports,
            onRefreshReports: () => loadReports({ status: reportStatus }),
            reports: filteredReports,
            mutatingReport,
            onOpenMemory,
            onResolveReport: handleReportDecision,
          }}
          logsProps={{
            logs: filteredLogs,
            logQuery,
            onLogQueryChange: setLogQuery,
            logAction,
            onLogActionChange: setLogAction,
            logSummary,
            loadingLogs,
            onRefreshLogs: loadLogs,
          }}
          settingsProps={{
            loadingSettings,
            savingSettings,
            settingsTagText: settingsForm.tagText,
            onSettingsTagTextChange: (value) => {
              settingsForm.setTagText(value);
              settingsForm.clearMessage();
            },
            settingsUploadMaxMb: settingsForm.uploadMaxMb,
            onSettingsUploadMaxMbChange: (value) => {
              settingsForm.setUploadMaxMb(value);
              settingsForm.clearMessage();
            },
            settingsUploadBatchMax: settingsForm.uploadBatchMax,
            onSettingsUploadBatchMaxChange: (value) => {
              settingsForm.setUploadBatchMax(value);
              settingsForm.clearMessage();
            },
            settingsUploadHourLimit: settingsForm.uploadHourLimit,
            onSettingsUploadHourLimitChange: (value) => {
              settingsForm.setUploadHourLimit(value);
              settingsForm.clearMessage();
            },
            settingsUploadDayLimit: settingsForm.uploadDayLimit,
            onSettingsUploadDayLimitChange: (value) => {
              settingsForm.setUploadDayLimit(value);
              settingsForm.clearMessage();
            },
            settingsInviteHourLimit: settingsForm.inviteHourLimit,
            onSettingsInviteHourLimitChange: (value) => {
              settingsForm.setInviteHourLimit(value);
              settingsForm.clearMessage();
            },
            settingsInviteDayLimit: settingsForm.inviteDayLimit,
            onSettingsInviteDayLimitChange: (value) => {
              settingsForm.setInviteDayLimit(value);
              settingsForm.clearMessage();
            },
            settingsUploadsEnabled: settingsForm.uploadsEnabled,
            onSettingsUploadsEnabledChange: (value) => {
              settingsForm.setUploadsEnabled(value);
              settingsForm.clearMessage();
            },
            settingsRegistrationsEnabled: settingsForm.registrationsEnabled,
            onSettingsRegistrationsEnabledChange: (value) => {
              settingsForm.setRegistrationsEnabled(value);
              settingsForm.clearMessage();
            },
            overviewSummary,
            currentOrigin,
            onOpenOverviewTab: () => setActiveTab('overview'),
            onOpenUsersTab: () => setActiveTab('users'),
            onOpenReportsTab: () => setActiveTab('reports'),
            onOpenImagesTab: () => setActiveTab('images'),
            onRefreshSettings,
            onSubmit: saveSiteSettings,
          }}
      />
    </section>
  );

  if (isPage) {
    return panel;
  }

  return (
    <div className="modal-overlay admin-overlay" role="presentation" onMouseDown={busy ? undefined : onClose}>
      {panel}
    </div>
  );
}

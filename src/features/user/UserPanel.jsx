import { useEffect, useState } from 'react';
import { StatusNotice } from '../../components/StatusNotice.jsx';
import {
  errorNotice,
  previewModeNotice,
  profileSavedNotice,
  uploadDisabledNotice,
} from '../../lib/userFeedback.js';
import { userSummaryStatsModel, userUploadPolicyModel } from '../../lib/userSpace.js';
import { UserGalleryScopeCard } from './UserGalleryScopeCard.jsx';
import { UserOnboardingCard } from './UserOnboardingCard.jsx';
import { UserProfileForm } from './UserProfileForm.jsx';
import { UserSummaryStats } from './UserSummaryStats.jsx';
import { UserTagStatsCard } from './UserTagStatsCard.jsx';
import { UserUploadPolicyCard } from './UserUploadPolicyCard.jsx';
import { latestUploadLabel, userDisplayName } from './userFormatters.js';

export function UserPanel({
  user,
  connected,
  summary,
  loadingSummary,
  savingProfile,
  summaryError,
  favoritesAvailable,
  favoritesError,
  favoritesNotice,
  uploadDisabled,
  galleryScope,
  onboarding,
  onClose,
  onRefresh,
  onSaveProfile,
  onShowMyImages,
  onShowFavorites,
  onShowAllImages,
  onResetMyImages,
  onSelectUserTag,
  onOpenUpload,
}) {
  const [editingProfile, setEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(summary.profile?.display_name ?? '');
  const [bio, setBio] = useState(summary.profile?.bio ?? '');
  const [profileNotice, setProfileNotice] = useState(null);

  useEffect(() => {
    setDisplayName(summary.profile?.display_name ?? '');
    setBio(summary.profile?.bio ?? '');
  }, [summary.profile]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileNotice(null);

    try {
      await onSaveProfile({ displayName, bio });
      setEditingProfile(false);
      setProfileNotice(profileSavedNotice());
    } catch (error) {
      setProfileNotice(errorNotice(error.message));
    }
  };

  const stats = userSummaryStatsModel({
    summary: {
      ...summary,
      latestUploadLabel: latestUploadLabel(summary),
    },
    loadingSummary,
    galleryScope,
  });
  const uploadPolicy = userUploadPolicyModel({ summary, uploadDisabled, loadingSummary });
  return (
    <div className="modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="modal user-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-panel-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="关闭个人中心">
          ×
        </button>
        <div className="user-panel-head">
          <p className="eyebrow">PERSONAL LIBRARY</p>
          <h2 id="user-panel-title">我的空间</h2>
          <p>{userDisplayName(user, summary.profile)}</p>
          {summary.profile?.bio && <p className="user-bio">{summary.profile.bio}</p>}
        </div>

        {!connected && (
          <StatusNotice
            notice={previewModeNotice('当前是预览模式', '个人统计需要连接 Supabase 项目后才能读取。')}
          />
        )}
        <StatusNotice notice={summaryError ? errorNotice(summaryError, '个人统计暂时不可用') : null} />
        <StatusNotice notice={favoritesError ? errorNotice(favoritesError, '收藏列表暂时不可用') : null} />
        <StatusNotice notice={favoritesNotice ? previewModeNotice('收藏功能暂未启用', favoritesNotice) : null} />
        <StatusNotice notice={profileNotice} />

        {editingProfile ? (
          <UserProfileForm
            user={user}
            displayName={displayName}
            bio={bio}
            savingProfile={savingProfile}
            onDisplayNameChange={setDisplayName}
            onBioChange={setBio}
            onCancel={() => setEditingProfile(false)}
            onSubmit={saveProfile}
          />
        ) : (
          <button className="text-button profile-edit-button" type="button" onClick={() => setEditingProfile(true)}>
            编辑个人资料
          </button>
        )}

        <UserSummaryStats stats={stats} />

        <UserGalleryScopeCard
          galleryScope={galleryScope}
          onShowMyImages={onShowMyImages}
          onShowFavorites={favoritesAvailable ? onShowFavorites : undefined}
          onShowAllImages={onShowAllImages}
        />

        <UserUploadPolicyCard
          model={uploadPolicy}
          uploadDisabled={uploadDisabled}
          onOpenUpload={onOpenUpload}
        />

        <UserOnboardingCard
          onboarding={onboarding}
          onOpenUpload={onOpenUpload}
          onShowAllImages={onShowAllImages}
          onResetMyImages={onResetMyImages}
        />

        <UserTagStatsCard
          tagStats={summary.tagStats}
          loadingSummary={loadingSummary}
          onRefresh={onRefresh}
          onSelectTag={onSelectUserTag}
        />

        {uploadDisabled && <StatusNotice notice={uploadDisabledNotice()} />}

        <div className="modal-actions user-panel-actions">
          <button className="ghost-button" type="button" onClick={onShowMyImages}>
            查看我的图片
          </button>
          {favoritesAvailable && (
            <button className="ghost-button" type="button" onClick={onShowFavorites}>
              我的收藏
            </button>
          )}
          <button
            className="primary-button"
            type="button"
            onClick={onOpenUpload}
            disabled={uploadDisabled}
            title={uploadDisabled ? '站点当前已暂停普通用户上传' : undefined}
          >
            批量上传
          </button>
        </div>
      </section>
    </div>
  );
}

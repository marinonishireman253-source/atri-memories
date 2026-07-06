import { Suspense } from 'react';
import { createPortal } from 'react-dom';
import {
  AdminPanel,
  AuthModal,
  ImageViewer,
  ThemeModal,
  UploadModal,
  UserPanel,
  BlogEditorModal,
} from './lazyPanels.js';

export function AppOverlays({
  uploadModal = {},
  userPanel = {},
  authModal = {},
  themeModal = {},
  adminPanel = {},
  viewer = {},
  blogEditor = {},
}) {
  const overlayContent = (
    <>
      {blogEditor.open && (
        <Suspense fallback={null}>
          <BlogEditorModal
            open={blogEditor.open}
            post={blogEditor.post}
            saving={blogEditor.saving}
            error={blogEditor.error}
            onClose={blogEditor.onClose}
            onSave={blogEditor.onSave}
          />
        </Suspense>
      )}

      {uploadModal.open && (
        <Suspense fallback={null}>
          <UploadModal
            connected={uploadModal.connected}
            uploading={uploadModal.uploading}
            tagPresets={uploadModal.settings.tagPresets}
            uploadMaxMb={uploadModal.settings.uploadMaxMb}
            uploadBatchMax={uploadModal.settings.uploadBatchMax}
            uploadHourLimit={uploadModal.settings.uploadHourLimit}
            uploadDayLimit={uploadModal.settings.uploadDayLimit}
            isAdmin={uploadModal.isAdmin}
            onClose={uploadModal.onClose}
            onSubmit={uploadModal.onUploadMemories}
          />
        </Suspense>
      )}
      {userPanel.open && userPanel.user && (
        <Suspense fallback={null}>
          <UserPanel
            user={userPanel.user}
            connected={userPanel.connected}
            summary={userPanel.summary}
            loadingSummary={userPanel.loadingSummary}
            savingProfile={userPanel.savingProfile}
            summaryError={userPanel.summaryError}
            favoritesCount={userPanel.favoritesCount}
            favoritesAvailable={userPanel.favoritesAvailable}
            loadingFavorites={userPanel.loadingFavorites}
            favoritesError={userPanel.favoritesError}
            favoritesNotice={userPanel.favoritesNotice}
            uploadDisabled={userPanel.uploadDisabled}
            galleryScope={userPanel.galleryScope}
            onboarding={userPanel.onboarding}
            onClose={userPanel.onClose}
            onRefresh={userPanel.onRefreshSummary}
            onSaveProfile={userPanel.onSaveProfile}
            onShowMyImages={userPanel.onShowCurrentUserImages}
            onShowFavorites={userPanel.onShowFavorites}
            onShowAllImages={userPanel.onShowAllImages}
            onResetMyImages={userPanel.onResetMyImages}
            onSelectUserTag={userPanel.onSelectUserTag}
            onOpenUpload={userPanel.onOpenUploadFromUser}
          />
        </Suspense>
      )}
      {authModal.open && (
        <Suspense fallback={null}>
          <AuthModal
            onClose={authModal.onClose}
            onSignIn={authModal.signIn}
            onSignUp={authModal.signUpWithPolicy}
            onResendConfirmation={authModal.resendConfirmation}
            onSendPasswordReset={authModal.sendPasswordReset}
            registrationsEnabled={authModal.settings.registrationsEnabled}
          />
        </Suspense>
      )}
      {themeModal.open && (
        <Suspense fallback={null}>
          <ThemeModal
            presets={themeModal.presets}
            selectedUrl={themeModal.background}
            onSelect={themeModal.onChangeBackground}
            onClose={themeModal.onClose}
          />
        </Suspense>
      )}
      {adminPanel.open && adminPanel.isAdmin && (
        <Suspense fallback={null}>
          <AdminPanel
            deleting={adminPanel.deleting}
            onClose={adminPanel.onClose}
            onOpenMemory={adminPanel.onOpenMemory}
            onFilterOwner={adminPanel.onFilterOwner}
            onDeleteMany={adminPanel.deleteMemories}
            settings={adminPanel.settings}
            loadingSettings={adminPanel.loadingSettings}
            savingSettings={adminPanel.savingSettings}
            settingsError={adminPanel.settingsError}
            onRefreshSettings={adminPanel.refreshSettings}
            onSaveSettings={adminPanel.saveSettings}
          />
        </Suspense>
      )}
      {viewer.memory && (
        <Suspense fallback={null}>
          <ImageViewer
            memory={viewer.memory}
            user={viewer.user}
            deleting={viewer.deleting}
            updating={viewer.updating}
            canManage={viewer.canManageMemory(viewer.memory)}
            isAdmin={viewer.isAdmin}
            favoriteIds={viewer.favoriteIds}
            favoritesAvailable={viewer.favoritesAvailable}
            togglingFavoriteId={viewer.togglingFavoriteId}
            tagPresets={viewer.tagPresets}
            collectionIndex={viewer.selectedMemoryIndex}
            collectionTotal={viewer.viewerMemories.length}
            hasPrevious={viewer.selectedMemoryIndex > 0}
            hasNext={viewer.selectedMemoryIndex >= 0 && viewer.selectedMemoryIndex < viewer.viewerMemories.length - 1}
            onPrevious={() => viewer.navigateMemory(-1)}
            onNext={() => viewer.navigateMemory(1)}
            onClose={viewer.onClose}
            onDelete={viewer.deleteMemory}
            onUpdate={viewer.onSaveMemoryInfo}
            onToggleFavorite={viewer.onToggleFavorite}
            onSelectTag={viewer.onSelectTag}
            onNeedAuth={viewer.onNeedAuth}
          />
        </Suspense>
      )}
    </>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(overlayContent, document.body);
  }

  return overlayContent;
}

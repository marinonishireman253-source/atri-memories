import { buildHomeActionItems } from '../lib/homeActions.js';

export function buildHomeActionsProps({
  user,
  isAdmin,
  uploadDisabled,
  galleryScope,
  favoritesAvailable,
  actions,
}) {
  const items = buildHomeActionItems({
    user,
    isAdmin,
    uploadDisabled,
    galleryScope,
    favoritesAvailable,
  }).map((item) => ({
    ...item,
    onAction: actions[item.actionKey],
  }));

  return { items };
}

export function buildHomeStatusProps({
  statusItems,
  actions,
}) {
  return {
    items: statusItems.map((item) => ({
      ...item,
      onDismiss:
        item.id === 'user-onboarding'
          ? actions.dismissOnboardingStatus
          : item.dismissible
            ? actions.dismissJourneyStatus
            : undefined,
      actionLabel:
        item.id === 'journey-my-images' ||
        item.id === 'journey-my-favorites' ||
        item.id === 'journey-upload-complete'
          ? '清除筛选'
          : item.actionLabel,
      onAction:
        item.id === 'journey-my-images' || item.id === 'journey-upload-complete'
          ? actions.clearOwnerFilterWithJourney
          : item.id === 'journey-my-favorites'
            ? actions.showAllPublicImages
            : item.actionKey === 'open-upload'
              ? actions.openUpload
              : item.actionKey === 'show-public'
                ? actions.showAllPublicImages
                : item.actionKey === 'reset-my-images'
                  ? actions.resetMyImagesFilters
                  : item.onAction,
    })),
  };
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  batchDeleteJourneyNotice,
  currentFavoritesScopeNotice,
  currentUserScopeNotice,
  homeSyncErrorNotice,
  sharedMemoryLoadingNotice,
  uploadCompletedJourneyNotice,
  uploadDisabledHomeNotice,
} from '../lib/userJourney.js';
import { userOnboardingNotice } from '../lib/userOnboarding.js';

export function useHomePageStatus({ error, loadingMemory, onboarding }) {
  const [journeyState, setJourneyState] = useState(null);
  const [dismissedOnboardingKey, setDismissedOnboardingKey] = useState(null);

  const dismissJourneyStatus = useCallback(() => {
    setJourneyState(null);
  }, []);

  useEffect(() => {
    if (!onboarding) {
      setDismissedOnboardingKey(null);
      return;
    }
    if (dismissedOnboardingKey && dismissedOnboardingKey !== onboarding.key) {
      setDismissedOnboardingKey(null);
    }
  }, [dismissedOnboardingKey, onboarding]);

  const clearOwnerScopedJourney = useCallback(() => {
    setJourneyState((current) =>
      current?.type === 'my-images' ||
      current?.type === 'my-favorites' ||
      current?.type === 'upload-complete'
        ? null
        : current,
    );
  }, []);

  const showUploadDisabled = useCallback(() => {
    setJourneyState({ type: 'upload-disabled' });
  }, []);

  const showCurrentUserScope = useCallback((user) => {
    if (!user) return;
    setJourneyState({ type: 'my-images', user });
  }, []);

  const showFavoritesScope = useCallback((user) => {
    if (!user) return;
    setJourneyState({ type: 'my-favorites', user });
  }, []);

  const showUploadCompleted = useCallback((user, uploadedCount) => {
    if (!user || uploadedCount <= 0) return;
    setJourneyState({ type: 'upload-complete', user, uploadedCount });
  }, []);

  const showBatchDeleteCompleted = useCallback((user, succeeded, failed) => {
    if (!user || succeeded + failed <= 0) return;
    setJourneyState({ type: 'batch-delete-complete', user, succeeded, failed });
  }, []);

  const dismissOnboardingStatus = useCallback(() => {
    if (onboarding?.key) {
      setDismissedOnboardingKey(onboarding.key);
    }
  }, [onboarding?.key]);

  const statusItems = useMemo(() => {
    const items = [];

    if (onboarding && dismissedOnboardingKey !== onboarding.key) {
      items.push({
        id: 'user-onboarding',
        notice: userOnboardingNotice(onboarding),
        actionKey: onboarding.actionKey,
        actionLabel: onboarding.actionLabel,
        dismissible: true,
      });
    }

    if (journeyState?.type === 'upload-disabled') {
      items.push({
        id: 'journey-upload-disabled',
        notice: uploadDisabledHomeNotice(),
        dismissible: true,
      });
    }

    if (journeyState?.type === 'my-images') {
      items.push({
        id: 'journey-my-images',
        notice: currentUserScopeNotice(journeyState.user),
        dismissible: true,
      });
    }

    if (journeyState?.type === 'my-favorites') {
      items.push({
        id: 'journey-my-favorites',
        notice: currentFavoritesScopeNotice(journeyState.user),
        dismissible: true,
      });
    }

    if (journeyState?.type === 'upload-complete') {
      items.push({
        id: 'journey-upload-complete',
        notice: uploadCompletedJourneyNotice(journeyState),
        dismissible: true,
      });
    }

    if (journeyState?.type === 'batch-delete-complete') {
      items.push({
        id: 'journey-batch-delete-complete',
        notice: batchDeleteJourneyNotice(journeyState),
        dismissible: true,
      });
    }

    if (error) {
      items.push({
        id: 'sync-error',
        notice: homeSyncErrorNotice(error),
      });
    }

    if (loadingMemory) {
      items.push({
        id: 'share-loading',
        notice: sharedMemoryLoadingNotice(),
      });
    }

    return items;
  }, [dismissedOnboardingKey, error, journeyState, loadingMemory, onboarding]);

  return {
    journeyState,
    statusItems,
    dismissJourneyStatus,
    dismissOnboardingStatus,
    clearOwnerScopedJourney,
    showUploadDisabled,
    showCurrentUserScope,
    showFavoritesScope,
    showUploadCompleted,
    showBatchDeleteCompleted,
  };
}

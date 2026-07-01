import { StatusNotice } from '../../components/StatusNotice.jsx';
import { userOnboardingNotice } from '../../lib/userOnboarding.js';

export function UserOnboardingCard({
  onboarding,
  onOpenUpload,
  onShowAllImages,
  onResetMyImages,
}) {
  if (!onboarding) {
    return null;
  }

  const handleAction = () => {
    if (onboarding.actionKey === 'open-upload') {
      onOpenUpload?.();
    }
    if (onboarding.actionKey === 'show-public') {
      onShowAllImages?.();
    }
    if (onboarding.actionKey === 'reset-my-images') {
      onResetMyImages?.();
    }
  };

  return (
    <div className="user-tags-card user-onboarding-card">
      <div className="user-card-title">
        <h3>下一步</h3>
      </div>
      <StatusNotice notice={userOnboardingNotice(onboarding)} />
      {onboarding.actionLabel && (
        <div className="scope-actions">
          <button className="primary-button compact" type="button" onClick={handleAction}>
            {onboarding.actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}

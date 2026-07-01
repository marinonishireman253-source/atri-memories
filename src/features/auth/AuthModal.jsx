import { useEffect, useState } from 'react';
import { StatusNotice } from '../../components/StatusNotice.jsx';
import {
  authConfirmationSentNotice,
  authEmailRequiredNotice,
  authPasswordResetSentNotice,
  authRegistrationSuccessNotice,
  errorNotice,
  registrationClosedNotice,
} from '../../lib/userFeedback.js';
import { AuthAccessPolicyCard } from './AuthAccessPolicyCard.jsx';
import { AuthForm } from './AuthForm.jsx';
import { AuthSecondaryActions } from './AuthSecondaryActions.jsx';
import { authAccessPolicyModel, authModeModel } from './authFlowModel.js';

export function AuthModal({
  onClose,
  onSignIn,
  onSignUp,
  onResendConfirmation,
  onSendPasswordReset,
  registrationsEnabled = true,
}) {
  const [mode, setMode] = useState('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const labels = authModeModel({ mode, registrationsEnabled });
  const accessPolicy = authAccessPolicyModel({ registrationsEnabled });

  useEffect(() => {
    if (!registrationsEnabled && mode === 'sign-up') {
      setMode('sign-in');
      setNotice(null);
    }
  }, [mode, registrationsEnabled]);

  const submit = async (event) => {
    event.preventDefault();
    setNotice(null);
    setSubmitting(true);

    try {
      if (mode === 'sign-in') {
        await onSignIn({ email, password });
        onClose();
      } else {
        if (!registrationsEnabled) {
          throw new Error('站点当前未开放公开注册，请联系管理员创建账号。');
        }
        await onSignUp({ email, password });
        setNotice(authRegistrationSuccessNotice());
        setMode('sign-in');
      }
    } catch (error) {
      setNotice(errorNotice(error.message));
      window.dispatchEvent(new Event('atri-auth-failure'));
    } finally {
      setSubmitting(false);
    }
  };

  const requireEmail = () => {
    if (!email.trim()) {
      setNotice(authEmailRequiredNotice());
      return false;
    }
    return true;
  };

  const sendReset = async () => {
    if (!requireEmail()) return;

    setSubmitting(true);
    setNotice(null);
    try {
      await onSendPasswordReset({ email });
      setNotice(authPasswordResetSentNotice());
    } catch (error) {
      setNotice(errorNotice(error.message));
      window.dispatchEvent(new Event('atri-auth-failure'));
    } finally {
      setSubmitting(false);
    }
  };

  const resendConfirmation = async () => {
    if (!requireEmail()) return;

    setSubmitting(true);
    setNotice(null);
    try {
      await onResendConfirmation({ email });
      setNotice(authConfirmationSentNotice());
    } catch (error) {
      setNotice(errorNotice(error.message));
      window.dispatchEvent(new Event('atri-auth-failure'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="modal auth-modal glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
        <p className="eyebrow">ACCOUNT</p>
        <h2 id="auth-title">{labels.title}</h2>
        <AuthAccessPolicyCard policy={accessPolicy} />
        {!registrationsEnabled && mode === 'sign-in' && <StatusNotice notice={registrationClosedNotice()} />}
        <StatusNotice notice={notice} />
        <AuthForm
          mode={mode}
          labels={labels}
          email={email}
          password={password}
          submitting={submitting}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={submit}
        />
        <AuthSecondaryActions
          registrationsEnabled={registrationsEnabled}
          labels={labels}
          submitting={submitting}
          onToggleMode={() => {
            setNotice(null);
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
          }}
          onSendReset={sendReset}
          onResendConfirmation={resendConfirmation}
        />
      </section>
    </div>
  );
}

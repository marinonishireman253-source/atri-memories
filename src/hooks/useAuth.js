import { useCallback, useEffect, useState } from 'react';
import { loadCurrentAdminStatus } from '../lib/adminStatus.js';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient.js';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(hasSupabaseConfig);

  const loadAdminStatus = useCallback(async (currentUser) => {
    if (!supabase || !currentUser) {
      setIsAdmin(false);
      return;
    }

    setIsAdmin(await loadCurrentAdminStatus({ supabase, currentUser }));
  }, []);

  useEffect(() => {
    if (!supabase) {
      const stored = sessionStorage.getItem('demo-session');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSession(parsed.session);
          setUser(parsed.user);
          setIsAdmin(parsed.isAdmin);
        } catch (e) {
          // ignore
        }
      }
      setLoadingAuth(false);
      return undefined;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const currentSession = data.session ?? null;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      await loadAdminStatus(currentSession?.user ?? null);
      setLoadingAuth(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      loadAdminStatus(currentSession?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadAdminStatus]);

  const signIn = async ({ email, password }) => {
    if (!supabase) {
      const isDemoAdmin = email.toLowerCase().includes('admin');
      const mockUser = {
        id: isDemoAdmin ? 'demo-admin-id' : 'demo-user-id',
        email: email,
        user_metadata: {
          full_name: isDemoAdmin ? 'ATRI 管理员' : '测试用户',
        }
      };
      const mockSession = {
        session: { user: mockUser },
        user: mockUser,
        isAdmin: isDemoAdmin
      };
      sessionStorage.setItem('demo-session', JSON.stringify(mockSession));
      setSession(mockSession.session);
      setUser(mockUser);
      setIsAdmin(isDemoAdmin);
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const currentSession = data.session ?? null;
    const currentUser = data.user ?? currentSession?.user ?? null;
    setSession(currentSession);
    setUser(currentUser);
    await loadAdminStatus(currentUser);
  };

  const signUp = async ({ email, password }) => {
    if (!supabase) {
      throw new Error('当前为本地预览模式，已跳过真实注册。请使用包含 "admin" 的邮箱登录以获得管理员身份。');
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const resendConfirmation = async ({ email }) => {
    if (!supabase) {
      throw new Error('当前为本地预览模式，无法发送确认邮件。');
    }
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw error;
  };

  const sendPasswordReset = async ({ email }) => {
    if (!supabase) {
      throw new Error('当前为本地预览模式，无法重置密码。');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!supabase) {
      sessionStorage.removeItem('demo-session');
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      return;
    }
    await supabase.auth.signOut();
  };

  return {
    session,
    user,
    isAdmin,
    loadingAuth,
    signIn,
    signUp,
    resendConfirmation,
    sendPasswordReset,
    signOut,
  };
}

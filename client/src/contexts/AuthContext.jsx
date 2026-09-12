import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService, tokenStore, setUnauthorizedHandler, ApiError } from '../services';
import { useToast } from './ToastContext';

/**
 * Auth state for the whole app.
 *
 * The access token lives in localStorage (needed for a stateless SPA) and the refresh
 * token is an httpOnly cookie the browser sends automatically — so a hard reload works,
 * and the long-lived secret is never readable from JS.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(() => tokenStore.user());
  const [status, setStatus] = useState(() => (tokenStore.get() ? 'restoring' : 'anonymous'));
  const [notice, setNotice] = useState(null);

  const settle = useCallback((nextUser) => {
    setUser(nextUser);
    setStatus(nextUser ? 'authenticated' : 'anonymous');
  }, []);

  // Restore the session on first paint: hit /auth/me, which transparently refreshes.
  useEffect(() => {
    let cancelled = false;
    if (!tokenStore.get()) {
      setStatus('anonymous');
      return undefined;
    }
    authService
      .me()
      .then((data) => {
        if (cancelled) return;
        tokenStore.set(data?.accessToken || tokenStore.get(), data?.user);
        settle(data?.user || null);
      })
      .catch(() => {
        if (cancelled) return;
        tokenStore.clear();
        settle(null);
      });
    return () => {
      cancelled = true;
    };
  }, [settle]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear();
      setUser(null);
      setStatus('anonymous');
    });
  }, []);

  const login = useCallback(
    async (credentials) => {
      const data = await authService.login(credentials);
      tokenStore.set(data.accessToken, data.user);
      settle(data.user);
      setNotice(null);
      return data.user;
    },
    [settle],
  );

  const register = useCallback(
    async (payload) => {
      const data = await authService.register(payload);
      tokenStore.set(data.accessToken, data.user);
      settle(data.user);
      return data.user;
    },
    [settle],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      /* the local session ends regardless */
    }
    tokenStore.clear();
    settle(null);
    toast.info('Signed out', 'Your session has ended on this device.');
  }, [settle, toast]);

  const updateProfile = useCallback(async (payload) => {
    const data = await authService.update(payload);
    tokenStore.set(data.accessToken || tokenStore.get(), data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthed: status === 'authenticated' && Boolean(user),
      isAdmin: user?.role === 'admin',
      notice,
      setNotice,
      login,
      register,
      logout,
      updateProfile,
      /** Route the login form's inline error area through the context (used by ProtectedRoute). */
      describeError: (err) => (err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'),
    }),
    [user, status, notice, login, register, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import api, { tokenStore, userStore } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => userStore.get());
  const [loading, setLoading] = useState(!!tokenStore.get());

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/api/auth/me');
      const u = res.data?.data?.user;
      if (u) {
        setUser(u);
        userStore.set(u);
      }
    } catch {
      tokenStore.clear();
      userStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    const { user: u, token } = res.data.data;
    tokenStore.set(token);
    userStore.set(u);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await api.post('/api/auth/register', payload);
    const { user: u, token } = res.data.data;
    tokenStore.set(token);
    userStore.set(u);
    setUser(u);
    return { user: u, message: res.data.message };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* ignore */
    }
    tokenStore.clear();
    userStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refresh,
      setUser,
      isAuthenticated: !!user,
      role: user?.role || null
    }),
    [user, loading, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

/**
 * Notification centre — polls the API for the signed-in user's notifications.
 */
const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    // Never poll while signed out — avoids a permanent 401 on public pages.
    if (!user) {
      setItems([]);
      setUnread(0);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get('/api/notifications?limit=20');
      setItems(res.data?.data?.notifications || []);
      setUnread(res.data?.data?.unread || 0);
    } catch {
      /* not signed in or network error — ignore */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    if (!user) return undefined;
    const id = setInterval(fetchNotifications, 45000);
    return () => clearInterval(id);
  }, [fetchNotifications, user]);

  const markRead = useCallback(async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await api.patch(`/api/notifications/${id}/read`);
    } catch {
      /* noop */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnread(0);
    try {
      await api.patch('/api/notifications/read-all');
    } catch {
      /* noop */
    }
  }, []);

  const remove = useCallback(async (id) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.delete(`/api/notifications/${id}`);
    } catch {
      /* noop */
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{ items, unread, loading, fetchNotifications, markRead, markAllRead, remove }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return ctx;
}

export default NotificationContext;

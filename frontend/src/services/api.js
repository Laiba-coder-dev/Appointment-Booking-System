import axios from 'axios';

/**
 * Central axios instance.
 * - Same-origin requests are proxied by Vite to the Express API.
 * - JWT is attached automatically and refreshed on 401 (single retry).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

const TOKEN_KEY = 'appointify_token';
const USER_KEY = 'appointify_user';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};

export const userStore = {
  get: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  set: (u) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
  clear: () => localStorage.removeItem(USER_KEY)
};

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && !original._retried) {
      original._retried = true;
      tokenStore.clear();
      userStore.clear();
      if (window.location.pathname.startsWith('/dashboard') ||
          window.location.pathname.startsWith('/provider') ||
          window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login';
      }
    }

    // Normalise error shape so UI can always read a message
    if (error.response?.data && typeof error.response.data === 'object') {
      error.message = error.response.data.message || error.message;
      error.code = error.response.data.code;
      error.details = error.response.data.details;
    }
    return Promise.reject(error);
  }
);

/** Unwrap helpers */
export const getData = (res) => res?.data?.data;
export const getMessage = (res) => res?.data?.message;

export default api;

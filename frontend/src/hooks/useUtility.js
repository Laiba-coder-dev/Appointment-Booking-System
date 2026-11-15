import { useEffect, useState } from 'react';

/** Sets document.title and restores the previous one on unmount. */
export function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} · Appointify` : 'Appointify · Premium Appointment Booking';
    return () => {
      document.title = prev;
    };
  }, [title]);
}

/** Simple debounced value (search inputs). */
export function useDebounced(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/** Tracks a media query. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mq.addEventListener?.('change', handler);
    setMatches(mq.matches);
    return () => mq.removeEventListener?.change && mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

/** Generic GET hook with loading/error states. */
export function useFetch(url, { enabled = true, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !url) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    const ctrl = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { default: api } = await import('../services/api');
        const res = await api.get(url, { signal: ctrl.signal });
        if (!cancelled) setData(res.data?.data ?? null);
      } catch (err) {
        if (!cancelled && err.name !== 'CanceledError' && err.name !== 'AbortError') {
          setError(err.message || 'Something went wrong');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled, ...deps]);

  return { data, loading, error };
}

export default useDocumentTitle;

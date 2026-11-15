import { useEffect, useState } from 'react';

/** Detects the OS reduced-motion preference. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  return reduced;
}

/**
 * Decides whether the heavy WebGL 3D scenes should run.
 * Conservative heuristics: reduced motion, small screens, low memory,
 * missing WebGL, or a user-toggled "lite mode".
 */
export function use3DEnabled() {
  const reduced = usePrefersReducedMotion();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (reduced) {
      setEnabled(false);
      return;
    }
    let ok = true;
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl');
      if (!gl) ok = false;
    } catch {
      ok = false;
    }

    const smallScreen = window.innerWidth < 640;
    const lowMemory = (navigator.deviceMemory || 8) <= 2;
    const lite = sessionStorage.getItem('appointify_lite3d') === '1';

    // Honour an explicit user choice from the on-screen toggle.
    const stored = localStorage.getItem('appointify_3d');
    if (stored === 'off') ok = false;
    if (stored === 'on') ok = true && !reduced;

    if (smallScreen && stored !== 'on') ok = false;
    if (lowMemory) ok = false;
    if (lite) ok = false;

    setEnabled(ok);
  }, [reduced]);

  return enabled;
}

export default usePrefersReducedMotion;

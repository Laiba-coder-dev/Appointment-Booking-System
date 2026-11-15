import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePrefersReducedMotion } from './useMotion';

gsap.registerPlugin(ScrollTrigger);

/**
 * Central GSAP ScrollTrigger hook used by the landing page.
 *
 * Declarative attributes inside the scoped subtree:
 *   data-reveal            → fade + rise on enter
 *   data-reveal="left|right|scale|blur" → direction variants
 *   data-stagger="0.08"    → children enter one-by-one
 *   data-parallax="40"     → moves Y by N px across the scroll
 *   data-parallax-x="30"   → horizontal drift
 *   data-sticky-speed      → (internal) scrub parallax
 *   data-counter="1200"    → counts up when visible
 *   data-line-reveal       → per-line masked text reveal
 */
export default function useGsapReveal(options = {}) {
  const scopeRef = useRef(null);
  const reduced = usePrefersReducedMotion();

  const { enabled = true, start = 'top 82%' } = options;

  useLayoutEffect(() => {
    const el = scopeRef.current;
    if (!el || !enabled) return undefined;

    // Reduced motion → make everything visible instantly, skip animation.
    if (reduced) {
      gsap.set(el.querySelectorAll('[data-reveal], [data-stagger] > *'), {
        clearProps: 'all',
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        filter: 'none'
      });
      el.querySelectorAll('[data-counter]').forEach((node) => {
        node.textContent = Number(node.dataset.counter).toLocaleString();
      });
      return undefined;
    }

    const ctx = gsap.context(() => {
      /* ---------- generic reveals ---------- */
      el.querySelectorAll('[data-reveal]').forEach((node) => {
        const variant = node.getAttribute('data-reveal') || 'up';
        const from =
          variant === 'left' ? { opacity: 0, x: -46 }
          : variant === 'right' ? { opacity: 0, x: 46 }
          : variant === 'scale' ? { opacity: 0, scale: 0.9, y: 18 }
          : variant === 'blur' ? { opacity: 0, y: 26, filter: 'blur(12px)' }
          : { opacity: 0, y: 40 };

        gsap.from(node, {
          ...from,
          duration: 0.95,
          ease: 'power3.out',
          scrollTrigger: { trigger: node, start, once: true, toggleActions: 'play none none none' },
          clearProps: 'filter'
        });
      });

      /* ---------- stagger groups ---------- */
      el.querySelectorAll('[data-stagger]').forEach((group) => {
        const step = Number(group.dataset.stagger) || 0.09;
        const children = Array.from(group.children);
        if (!children.length) return;
        gsap.from(children, {
          opacity: 0,
          y: 44,
          scale: 0.97,
          duration: 0.85,
          ease: 'power3.out',
          stagger: step,
          scrollTrigger: { trigger: group, start, once: true, toggleActions: 'play none none none' }
        });
      });

      /* ---------- parallax ---------- */
      el.querySelectorAll('[data-parallax]').forEach((node) => {
        const dist = Number(node.dataset.parallax) || 60;
        gsap.fromTo(
          node,
          { y: dist },
          {
            y: -dist,
            ease: 'none',
            scrollTrigger: {
              trigger: node.closest('section') || node,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.1
            }
          }
        );
      });

      el.querySelectorAll('[data-parallax-x]').forEach((node) => {
        const dist = Number(node.dataset.parallaxX) || 40;
        gsap.fromTo(
          node,
          { x: -dist },
          {
            x: dist,
            ease: 'none',
            scrollTrigger: {
              trigger: node.closest('section') || node,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.4
            }
          }
        );
      });

      /* ---------- hero-layered scroll speeds ---------- */
      el.querySelectorAll('[data-speed]').forEach((node) => {
        const speed = Number(node.dataset.speed) || 1;
        gsap.to(node, {
          y: () => (1 - speed) * 260,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: 'bottom top',
            scrub: 1
          }
        });
      });

      /* ---------- masked line reveals ---------- */
      el.querySelectorAll('[data-line-reveal]').forEach((node) => {
        const lines = node.querySelectorAll('.reveal-line > span');
        if (!lines.length) return;
        gsap.from(lines, {
          yPercent: 118,
          duration: 1.05,
          ease: 'power4.out',
          stagger: 0.1,
          scrollTrigger: { trigger: node, start, once: true }
        });
      });

      /* ---------- number counters ---------- */
      el.querySelectorAll('[data-counter]').forEach((node) => {
        const target = Number(node.dataset.counter) || 0;
        const decimals = Number(node.dataset.decimals || 0);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 1.9,
          ease: 'power2.out',
          scrollTrigger: { trigger: node, start: 'top 88%', once: true },
          onUpdate: () => {
            node.textContent =
              decimals > 0
                ? obj.v.toFixed(decimals)
                : Math.round(obj.v).toLocaleString();
          }
        });
      });
    }, scopeRef);

    return () => ctx.revert();
  }, [enabled, reduced, start]);

  /* Refresh triggers after images/fonts settle */
  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 700);
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);
    return () => {
      clearTimeout(t);
      window.removeEventListener('load', onLoad);
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  return scopeRef;
}

export { gsap, ScrollTrigger };

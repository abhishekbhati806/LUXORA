import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ------------------------------------------------------------------ media */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
export const useHasFinePointer = () => useMediaQuery('(pointer: fine) and (hover: hover)');

/* ------------------------------------------------------------------ misc */
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function useLockBody(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [locked]);
}

export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : JSON.parse(raw);
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        try {
          if (resolved === undefined || resolved === null) localStorage.removeItem(key);
          else localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* private mode: keep in-memory state only */
        }
        return resolved;
      });
    },
    [key],
  );
  return [value, set];
}

/** Scroll progress 0→1 for an element (or the window), rAF-driven, no listeners per frame. */
export function useScrollProgress(ref) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = ref?.current;
    let frame = 0;
    const measure = () => {
      const now = performance.now();
      if (now - (measure.last || 0) < 16) return;
      measure.last = now;
      const target = el || document.documentElement;
      const top = el ? target.getBoundingClientRect().top : window.scrollY;
      const range = (el ? target.offsetHeight : document.documentElement.scrollHeight) - window.innerHeight;
      const p = range <= 0 ? 0 : Math.min(1, Math.max(0, (el ? -top : -top) / range));
      setProgress(Number.isFinite(p) ? p : 0);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ref]);
  return progress;
}

/** Returns [ref, { x, y }] with the pointer position relative to the element, in -1..1. */
export function usePointerTilt({ disabled = false, strength = 1 } = {}) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const raf = useRef(0);

  const onMove = useCallback(
    (event) => {
      if (disabled) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2 * strength;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2 * strength;
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => setTilt({ x, y }));
    },
    [disabled, strength],
  );

  const onLeave = useCallback(() => {
    if (disabled) return;
    cancelAnimationFrame(raf.current);
    setTilt({ x: 0, y: 0 });
  }, [disabled]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return { ref, tilt, handlers: { onMouseMove: onMove, onMouseLeave: onLeave } };
}

export function usePrevious(value) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

/** Escape / outside-click / focus trap for dialogs and drawers. */
export function useDismiss({ active, onDismiss, initialFocusRef, returnFocusRef }) {
  const panelRef = useRef(null);
  useEffect(() => {
    const returnFocusEl = returnFocusRef?.current;
    if (!active) return undefined;
    const previouslyFocused = document.activeElement;
    const focusTimer = setTimeout(() => {
      const target = initialFocusRef?.current || panelRef.current?.querySelector('[data-autofocus],button,a,input,select,textarea,[tabindex]');
      target?.focus?.();
    }, 40);

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onDismiss?.();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = [...panelRef.current.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')];
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey, true);
      if (returnFocusEl) returnFocusEl.focus?.();
      else if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus?.();
    };
  }, [active, onDismiss, initialFocusRef, returnFocusRef]);
  return panelRef;
}

/** Count-up used by dashboard statistics; snaps to the value when motion is reduced. */
export function useCountUp(target, { duration = 1100, decimals = 0, start = true } = {}) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(reduced || !start ? target : 0);
  const from = useRef(0);
  useEffect(() => {
    if (reduced || !start) {
      setValue(target);
      from.current = target;
      return undefined;
    }
    const t0 = performance.now();
    const initial = from.current;
    let frame;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - p) ** 3;
      const next = initial + (target - initial) * eased;
      setValue(next);
      if (p < 1) frame = requestAnimationFrame(tick);
      else from.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced, start]);
  return useMemo(() => Number(value.toFixed(decimals)), [value, decimals]);
}

/** IntersectionObserver wrapper for "animate once when it enters" without a library. */
export function useInViewOnce({ threshold = 0.18, rootMargin = '0px 0px -8% 0px' } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return undefined;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, threshold, rootMargin]);
  return [ref, inView];
}

export { useApi } from "./useApi";

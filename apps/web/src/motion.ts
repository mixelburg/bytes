import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Shared motion helpers. Keyframes (mslide/mpop/mpulse/mfade/mshimmer/mdraw/
// mcheck/mcountdown) live in main.tsx; the global `prefers-reduced-motion`
// reset there disables all keyframe animation, so the JS helpers below also
// check the media query and degrade to an instant, final-state result.

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Capped stagger delay for list entrances — ~40ms step, capped so long lists
 *  don't produce an unbounded cascade. Use as `style={{ animationDelay }}`. */
export const staggerDelay = (i: number) => `${Math.min(i, 8) * 40}ms`;

/** Tween a number from its previous value to `value` (~250ms, easeOutCubic).
 *  Jumps straight to the value under reduced-motion. */
export function useTween(value: number, ms = 250): number {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  const raf = useRef(0);
  useEffect(() => {
    if (prefersReduced() || value === from.current) {
      from.current = value;
      setDisplay(value);
      return;
    }
    const start = from.current;
    const delta = value - start;
    let t0: number | null = null;
    const step = (t: number) => {
      if (t0 === null) t0 = t;
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - (1 - p) ** 3;
      setDisplay(start + delta * eased);
      if (p < 1) raf.current = requestAnimationFrame(step);
      else from.current = value;
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, ms]);
  return display;
}

/** Fly a clone of `source` straight to the cart icon (the visible element
 *  tagged `data-cart-target` — top bar on desktop, bottom nav on mobile).
 *  No-op under reduced-motion or if the target is gone. */
export function flyToCart(source: HTMLElement) {
  const targets = document.querySelectorAll<HTMLElement>('[data-cart-target]');
  const target = Array.from(targets).find((t) => t.offsetParent !== null);
  if (!target || prefersReduced()) return;
  const s = source.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const ghost = source.cloneNode(true) as HTMLElement;
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${s.left}px`,
    top: `${s.top}px`,
    width: `${s.width}px`,
    height: `${s.height}px`,
    margin: '0',
    pointerEvents: 'none',
    zIndex: '9999',
    transformOrigin: 'top left',
    transition: 'transform .5s cubic-bezier(.4,0,.2,1), opacity .5s ease-in',
  });
  document.body.appendChild(ghost);
  const dx = t.left + t.width / 2 - (s.left + s.width / 2);
  const dy = t.top + t.height / 2 - (s.top + s.height / 2);
  requestAnimationFrame(() => {
    ghost.style.transform = `translate(${dx}px, ${dy}px) scale(.12)`;
    ghost.style.opacity = '0.25';
  });
  ghost.addEventListener('transitionend', () => ghost.remove(), { once: true });
}

/** Pull-to-refresh for the top of the page. Tracks a downward drag that starts
 *  at scroll-top and runs `onRefresh` once it passes the threshold. Returns the
 *  live pull distance (px) and a refreshing flag for the affordance. Touch-only,
 *  so desktop simply never triggers it — the manual refetch path still works. */
export function usePullToRefresh(onRefresh: () => Promise<unknown> | unknown) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const cb = useRef(onRefresh);
  cb.current = onRefresh;
  useEffect(() => {
    const THRESHOLD = 70;
    const startY = { v: null as number | null };
    const pulled = { v: 0 };
    const busy = { v: false };
    const set = (v: number) => {
      pulled.v = v;
      setPull(v);
    };
    const start = (e: TouchEvent) => {
      startY.v = window.scrollY <= 0 && !busy.v ? e.touches[0].clientY : null;
    };
    const move = (e: TouchEvent) => {
      if (startY.v == null) return;
      const dy = e.touches[0].clientY - startY.v;
      if (dy > 0) set(Math.min(dy, THRESHOLD * 1.5));
    };
    const end = async () => {
      if (startY.v == null) return;
      startY.v = null;
      if (pulled.v < THRESHOLD) return set(0);
      busy.v = true;
      setRefreshing(true);
      set(THRESHOLD);
      try {
        await cb.current();
      } finally {
        busy.v = false;
        setRefreshing(false);
        set(0);
      }
    };
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', end);
    return () => {
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
    };
  }, []);
  return { pull, refreshing };
}

/** FLIP grid reflow: returns a ref for the grid container. When its keyed
 *  children (tagged `data-flip-id`) reorder, they transition from their old
 *  positions to the new ones instead of snapping. No-op under reduced-motion.
 *  ponytail: measures all children each render; fine for a product grid, swap
 *  to a keyed diff if the grid ever holds thousands of live nodes. */
export function useFlip<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const prev = useRef<Map<string, DOMRect>>(new Map());
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    const reduce = prefersReduced();
    for (const c of kids) {
      const id = c.dataset.flipId;
      if (!id) continue;
      const now = c.getBoundingClientRect();
      const old = prev.current.get(id);
      if (old && !reduce) {
        const dx = old.left - now.left;
        const dy = old.top - now.top;
        if (dx || dy) {
          c.style.transition = 'none';
          c.style.transform = `translate(${dx}px, ${dy}px)`;
          requestAnimationFrame(() => {
            c.style.transition = 'transform .35s ease';
            c.style.transform = '';
          });
        }
      }
    }
    prev.current = new Map(
      kids
        .filter((c) => c.dataset.flipId)
        .map((c) => [c.dataset.flipId as string, c.getBoundingClientRect()]),
    );
  });
  return ref;
}

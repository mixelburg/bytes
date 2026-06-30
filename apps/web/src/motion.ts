import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Shared motion helpers. Keyframes (mslide/mpop/mpulse/mfade/mshimmer/mdraw/
// mcheck/mcountdown) live in main.tsx; the global `prefers-reduced-motion`
// reset there disables all keyframe animation, so the JS helpers below also
// check the media query and degrade to an instant, final-state result.

const prefersReduced = () =>
  typeof window !== 'undefined' &&
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

/** Fly a clone of `source` to the cart icon (the element tagged
 *  `data-cart-target`). No-op under reduced-motion or if the target is gone. */
export function flyToCart(source: HTMLElement) {
  const target = document.querySelector<HTMLElement>('[data-cart-target]');
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
    transition:
      'transform .55s cubic-bezier(.5,-0.15,.4,1), opacity .55s ease-in',
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

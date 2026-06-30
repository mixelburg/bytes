## Context

The app already has a motion foundation in `apps/web/src/main.tsx`: global `@keyframes mslide` (translateY 8px + fade) and `@keyframes mpop` (scale .85 + fade), plus a global `prefers-reduced-motion: reduce` rule that sets `* { animation: none !important }`. A few places use these or ad-hoc transitions (checkout, confirm, product-card, route-schematic, ui.tsx button transition). Most screens render statically. This change is presentational polish — no data, state, or spec behavior of existing capabilities changes.

## Goals / Non-Goals

**Goals:**
- Apply the existing primitives consistently across all primary screens.
- Add a capped stagger for list-like content and lightweight press/state-change feedback.
- Keep everything within the Mono Editorial constraints and the existing reduced-motion guarantee.
- Zero new dependencies.

**Non-Goals:**
- No animation library (framer-motion, etc.) and no FLIP/layout/number-roll libraries. YAGNI for CSS keyframes + MUI `styled` + a few small hand-rolled helpers.
- No scroll-driven, parallax, shared-element, or physics-based motion.
- No changes to routing or business logic; data fetching is reused (pull-to-refresh calls the existing TanStack Query `refetch`).
- No new colors, shadows, or effects — flourishes stay monochrome and structural.
- `@capacitor/haptics` is the only new dependency; no other plugins or libs.

## Decisions

- **CSS keyframes over a library.** The primitives already exist and cover entrance/pop. A library would add bundle weight and a new mental model for motion the design deliberately keeps minimal (transform/opacity, 0.2–0.3s). Reject framer-motion.
- **Stagger via inline `animationDelay`, capped.** Render items with `style={{ animationDelay: ... }}` computed as `Math.min(i, CAP) * step` (e.g. `step` ~40ms, `CAP` ~8). Plain arithmetic, no per-item state. Avoids unbounded cascades on large/paginated lists. Alternative (IntersectionObserver reveal-on-scroll) rejected as over-engineering for the current screens.
- **Press feedback via `:active` transform in `styled`.** Add `&:active { transform: scale(.97) }` to the shared button/control styles in `components/ui.tsx` so it applies everywhere those primitives are used — one edit, broad reach. Avoids touching each call site.
- **Reduced-motion handled by the existing global rule.** Because all new motion uses `animation`/keyframes (and the `:active` transform is instantaneous, not motion the rule needs to kill), the existing `* { animation: none !important }` already covers entrances/staggers/pulses. Any new transition-based motion gets an explicit `@media (prefers-reduced-motion: reduce)` guard. No new global wiring needed.
- **Skeleton pulse** reuses a single shared keyframe (opacity pulse) applied to existing skeleton elements rather than swapping in MUI's `<Skeleton>` everywhere.
- **Number roll** via a tiny `requestAnimationFrame` tween hook (`useTween(value)`) that interpolates old→new over ~250ms; mono font keeps width stable so no layout jitter. Reject odometer/number libraries — a dozen lines covers it.
- **Add-to-cart fly** via a transient absolutely-positioned ghost: capture the source tile's `getBoundingClientRect()` and the cart icon's rect, animate a clone between them with a `transform`, remove on `animationend`. No portal lib; render into `document.body`. One shared helper called from the add-to-cart handler.
- **Grid reflow (FLIP)** — measure item rects before re-order, apply inverse transform, then transition to identity. Small hand-rolled FLIP over a layout-animation library; the grid is the only place that needs it.
- **Stripe shimmer** — extend the existing striped-tile background with a moving highlight keyframe; gate on the image's `load` event (`onLoad` clears it). No change to the tile's visual identity.
- **Scrim/overlay fades & toast countdown** — opacity transitions and a single hairline element whose width/scaleX depletes over `autoHideDuration` (already 4000ms in `SnackbarProvider`). Toasts already use a custom `MaterialDesignContent` (`Toast` in `main.tsx`), so this is a localized edit.
- **Draw-in checkmark** — inline SVG `<path>` with `stroke-dasharray`/`stroke-dashoffset` animated to 0. One element on the confirm screen; no Lottie/asset.
- **Pull-to-refresh** — TanStack Query already owns the catalog fetch, so the gesture just calls `refetch()`. Use Capacitor's web-friendly touch handling / a minimal touch-delta handler at the list top; reject a dedicated PTR library. Falls back to the existing manual refetch where the gesture isn't available.
- **Haptics** — `@capacitor/haptics` `Haptics.impact({ style: ImpactStyle.Light })` in the add-to-cart handler, wrapped so a missing/unsupported plugin is a no-op. This is the single new dependency; it's the official plugin and tiny. Reject hand-rolling Vibration API across platforms — the plugin already normalizes web/iOS/Android.

## Risks / Trade-offs

- [Stagger could feel slow on full pages] → cap the delay (`Math.min`) so later items aren't gated on a long cascade.
- [StrictMode double-mount could replay entrance animations in dev] → entrances are idempotent (run once on mount, end in visible state); acceptable, dev-only.
- [Inline `animationDelay` style prop must survive the styled-components prop filter] → it's a standard `style` object on the DOM node, unaffected by `shouldForwardProp`.

## Open Questions

- None blocking. Exact `step`/`CAP`/duration values are tunable during implementation within the 0.2–0.3s envelope.
- Number-roll duration (~250ms) and fly-to-cart arc/easing are tunable; default to a straight `transform` translate unless an arc reads better.

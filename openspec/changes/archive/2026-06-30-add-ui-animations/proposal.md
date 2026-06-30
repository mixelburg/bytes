## Why

The app already ships motion primitives (`mslide`/`mpop` keyframes, a global `prefers-reduced-motion` reset) but they're applied unevenly — a few screens animate, most don't. The result feels static and inconsistent. Applying the existing primitives consistently across every async flow and interaction makes the UI feel "fast" (design principle #5) without adding weight or a new dependency.

## What Changes

- Apply the existing `mslide`/`mpop` keyframes consistently across all screens: list, detail, cart, checkout, confirm, orders, track, saved.
- Staggered entrance for list-like content (product grid, cart lines, order rows, saved items) — items reveal in sequence on mount, capped so long lists don't animate forever.
- Micro-interactions on press for primary controls (add-to-cart, qty steppers, buttons): a quick `:active` scale, transform/opacity only.
- Animate state transitions that currently snap: cart count badge pop, qty value change, route-schematic draw-in on the track screen.
- Loading skeletons fade/pulse instead of appearing instantly (within the existing four-state contract).
- **Signature flourishes** layered on top, all on-brand:
  - **Number roll**: prices and cart totals tween their digits instead of snapping (mono font reads cleanly).
  - **Add-to-cart fly**: a ghost of the product tile animates toward the cart icon, ending in the badge pop.
  - **Filter/sort reflow**: the product grid repositions items with a transform transition (FLIP) when the filter/sort changes, instead of a hard re-render.
  - **Stripe-tile shimmer**: the diagonal stripe placeholder gets a slow sweep until the real image loads.
  - **Sold-out scrim fade**: the "MAX STOCK / sold out" overlay fades in rather than snapping on.
  - **Toast polish**: toasts get the `mslide` entrance plus a thin hairline that counts down the auto-hide.
  - **Draw-in checkmark**: the order-confirmed screen draws a single mono SVG checkmark stroke.
  - **Pull-to-refresh**: native-feeling pull gesture refetches the product list (Capacitor/mobile).
  - **Haptics**: a light haptic tap on add-to-cart (Capacitor).
- All motion stays within the Mono Editorial constraints (transform/opacity only, 0.2–0.3s ease, no new colors/effects) and honors the existing reduced-motion reset.
- No new animation library — CSS keyframes + MUI `styled` only. (One small native dep for haptics; see Impact.)

## Capabilities

### New Capabilities
- `ui-motion`: defines the app-wide motion system — the shared primitives, where entrance/stagger/press/state-change animations apply, timing/easing constraints, and the reduced-motion guarantee.

### Modified Capabilities
<!-- None — this is presentational polish layered on existing screens; no spec-level behavior of cart/catalog/checkout/etc. changes. -->

## Impact

- Code: `apps/web/src/main.tsx` (keyframes — extend if needed), `apps/web/src/components/*` (ui.tsx, product-card.tsx, route-schematic.tsx), `apps/web/src/screens/*` (list, detail, cart, checkout, confirm, orders, track, saved). New small helpers for number-roll and the fly-to-cart effect.
- Dependencies: `@capacitor/haptics` added (small, official Capacitor plugin) for the add-to-cart haptic tap. No animation library.
- Risk: low — mostly presentational; reduced-motion users see no motion, haptics degrade to a no-op on web/unsupported devices, and pull-to-refresh falls back to existing manual refetch.

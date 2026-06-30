## 1. Shared primitives

- [x] 1.1 In `components/ui.tsx`, add a `:active { transform: scale(.97) }` press response to the shared button/control primitives (with a `prefers-reduced-motion` guard if it uses a transition).
- [x] 1.2 Add a shared skeleton pulse keyframe in `main.tsx` (opacity pulse) and a small stagger helper (`staggerDelay(i)` returning `Math.min(i, 8) * 40ms`) co-located where screens can import it.

## 2. Entrance + stagger across screens

- [x] 2.1 List screen: apply `mslide`/`mpop` entrance with capped stagger to the product grid.
- [x] 2.2 Cart screen: stagger cart line entrances.
- [x] 2.3 Orders + Saved screens: stagger row/item entrances.
- [x] 2.4 Detail, checkout, confirm screens: apply a single entrance animation to the main content block.

## 3. State-change feedback

- [x] 3.1 Cart count badge: `mpop` on value change.
- [x] 3.2 Qty value change in cart/detail: subtle pop on the displayed number.
- [x] 3.3 Track screen: draw-in animation for the route schematic.

## 4. Loading motion

- [x] 4.1 Apply the skeleton pulse to existing loading placeholders across screens.

## 5. Signature flourishes

- [x] 5.1 Number roll: add a small `useTween(value)` rAF hook and apply it to prices (detail/list) and cart totals.
- [x] 5.2 Add-to-cart fly: shared helper that clones the source tile rect → cart icon rect, animates a `transform` ghost in `document.body`, removes on `animationend`; wire into the add-to-cart handler and trigger the badge pop on arrival.
- [x] 5.3 Grid reflow: hand-rolled FLIP on the product grid when filter/search/sort changes order.
- [x] 5.4 Stripe shimmer: add a moving-highlight keyframe to the tile placeholder, cleared on image `onLoad`.
- [x] 5.5 Scrim/overlay fade: opacity transition on the sold-out / max-stock scrim (with reduced-motion guard).
- [x] 5.6 Toast polish: give the `Toast` component the `mslide` entrance and a hairline that depletes over `autoHideDuration`.
- [x] 5.7 Draw-in checkmark: inline SVG with animated `stroke-dashoffset` on the confirm screen.

## 6. Native touches

- [x] 6.1 Pull-to-refresh: touch-delta handler at the top of the product list calling TanStack Query `refetch()`, with a pull/spinner affordance; falls back to existing manual refetch.
- [x] 6.2 Haptics: add `@capacitor/haptics`; fire `Haptics.impact({ style: Light })` on add-to-cart, wrapped so web/unsupported is a no-op.

## 7. Verify

- [x] 7.1 Manually confirm all motion (entrances, stagger, pops, number roll, fly, reflow, shimmer, scrim, checkmark) respects `prefers-reduced-motion: reduce` — content fully visible, no animation.
- [x] 7.2 Confirm haptics no-op on web and pull-to-refresh falls back cleanly when the gesture is unavailable.
- [x] 7.3 Run `nx test web` and `nx lint web`; confirm no `any` introduced and screens still render all four async states.

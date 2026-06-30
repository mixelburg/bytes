# ui-motion Specification

## Purpose
TBD - created by archiving change add-ui-animations. Update Purpose after archive.
## Requirements
### Requirement: Shared motion primitives

The system SHALL expose a small set of reusable, app-wide motion primitives (entrance slide, pop, stagger) built from CSS keyframes and MUI `styled`, using only `transform` and `opacity` and durations in the 0.2–0.3s ease range. No animation library SHALL be added.

#### Scenario: Primitives are reused, not redefined per screen

- **WHEN** a screen needs an entrance or pop animation
- **THEN** it references the shared `mslide`/`mpop` primitives (or a shared helper) rather than declaring new bespoke keyframes

#### Scenario: Motion stays within editorial constraints

- **WHEN** any animation runs
- **THEN** it animates only `transform`/`opacity`, completes within ~0.3s, and introduces no new colors, shadows, or banned effects (gradient text, glassmorphism, neon)

### Requirement: Content entrance and stagger

The system SHALL animate content into view on mount across the primary screens (list, detail, cart, checkout, confirm, orders, track, saved). List-like collections SHALL reveal items in a staggered sequence, with the per-item delay capped so large lists do not produce an unbounded or distracting cascade.

#### Scenario: Product grid staggers on load

- **WHEN** the product list finishes loading and renders items
- **THEN** items fade/slide in sequentially with a small incremental delay that is capped after the first several items

#### Scenario: Long lists do not animate indefinitely

- **WHEN** a collection renders many items (e.g. a full page of products)
- **THEN** the cumulative stagger delay is bounded so the last visible items still appear promptly

### Requirement: Interaction and state-change feedback

The system SHALL provide motion feedback for key interactions and value changes: a quick press (`:active`) scale on primary controls (add-to-cart, qty steppers, buttons), a pop when the cart count changes, and a draw-in for the route schematic on the track screen.

#### Scenario: Primary control responds to press

- **WHEN** a user presses a primary button or qty stepper
- **THEN** the control briefly scales via `transform` and returns to rest, with no layout shift

#### Scenario: Cart count animates on change

- **WHEN** the cart item count changes
- **THEN** the badge animates (pop) to draw attention to the new value

### Requirement: Loading state motion

The system SHALL animate loading placeholders (skeletons) with a fade or pulse rather than having them appear and disappear instantly, while preserving the existing loading / empty / error / success four-state contract.

#### Scenario: Skeleton fades in

- **WHEN** a screen enters its loading state
- **THEN** skeleton placeholders appear via a fade/pulse rather than a hard cut

### Requirement: Value tween (number roll)

The system SHALL animate numeric value changes for prices and cart totals by tweening the displayed digits rather than snapping, using a short transition within the standard timing envelope.

#### Scenario: Cart total tweens on change

- **WHEN** the cart total changes (item added, removed, or quantity edited)
- **THEN** the displayed amount animates from the old value to the new value over a short duration rather than snapping instantly

#### Scenario: Tween respects reduced-motion

- **WHEN** `prefers-reduced-motion: reduce` is set
- **THEN** numeric values update immediately to their final value with no tween

### Requirement: Add-to-cart fly

The system SHALL provide a fly-to-cart effect: when a product is added to the cart, a transient ghost of the product tile animates from the source toward the cart icon and resolves into the cart count pop. The effect SHALL use only `transform`/`opacity` and SHALL not block interaction or shift layout.

#### Scenario: Adding a product flies to the cart

- **WHEN** a user taps add-to-cart on a product
- **THEN** a transient ghost element animates from the tile toward the cart icon and the cart badge pops on arrival

#### Scenario: Fly is suppressed under reduced-motion

- **WHEN** `prefers-reduced-motion: reduce` is set and a product is added
- **THEN** no ghost animates; the cart updates and badge reflects the new count immediately

### Requirement: Grid reflow on filter/sort

The system SHALL animate product grid item repositioning when the active filter, search, or sort changes, transitioning items to their new positions via `transform` rather than re-rendering with a hard cut.

#### Scenario: Sort change reflows items

- **WHEN** the user changes sort or category and the grid order changes
- **THEN** items that remain visible transition to their new positions rather than snapping

### Requirement: Image placeholder shimmer

The system SHALL animate the striped image placeholder with a slow sweep/shimmer while the real product image is loading, ceasing once the image has loaded.

#### Scenario: Placeholder shimmers until loaded

- **WHEN** a product image has not yet loaded
- **THEN** its striped placeholder shows a slow sweep, which stops when the image loads

### Requirement: Scrim and overlay fades

The system SHALL fade in overlays that currently appear instantly — including the sold-out / max-stock scrim — using an opacity transition within the standard timing envelope.

#### Scenario: Sold-out scrim fades in

- **WHEN** a product becomes sold out or max stock is reached
- **THEN** the scrim/overlay fades in rather than appearing instantly

### Requirement: Toast entrance and countdown

The system SHALL give toasts a slide entrance using the shared primitive and SHALL display a thin hairline indicator that depletes over the toast's auto-hide duration.

#### Scenario: Toast slides in with countdown

- **WHEN** a toast is shown
- **THEN** it enters via the shared slide animation and a hairline indicator depletes over the auto-hide duration

### Requirement: Order confirmation checkmark

The order-confirmed screen SHALL draw a single mono SVG checkmark via stroke animation on success, within the standard timing envelope and suppressed under reduced-motion.

#### Scenario: Checkmark draws on order success

- **WHEN** the order-confirmed screen renders after a successful order
- **THEN** a single checkmark draws its stroke in; under reduced-motion it appears fully drawn immediately

### Requirement: Pull-to-refresh

The product list SHALL support a pull-to-refresh gesture that refetches the catalog, with a visible pull/spinner affordance. Where the gesture is unavailable, the existing manual refetch path SHALL remain functional.

#### Scenario: Pull refreshes the list

- **WHEN** the user pulls down at the top of the product list past the threshold
- **THEN** the catalog refetches and a pull/loading affordance is shown until it completes

### Requirement: Haptic feedback

The system SHALL trigger a light haptic tap on add-to-cart via the Capacitor Haptics plugin. On web or unsupported devices the call SHALL degrade to a no-op without error.

#### Scenario: Add-to-cart taps haptics on device

- **WHEN** a user adds a product to the cart on a device that supports haptics
- **THEN** a light haptic impact fires

#### Scenario: Haptics no-op on web

- **WHEN** add-to-cart runs on web or a device without haptics support
- **THEN** the action completes normally with no error and no haptic

### Requirement: Reduced-motion compliance

The system SHALL honor `prefers-reduced-motion: reduce` for all animations introduced by this change, disabling motion for users who request it. Content SHALL remain fully visible and usable with motion disabled.

#### Scenario: Reduced-motion user sees no animation

- **WHEN** the user's OS has `prefers-reduced-motion: reduce` set
- **THEN** entrances, staggers, pops, press scales, skeleton pulses, number tweens, the fly-to-cart ghost, grid reflow, placeholder shimmer, scrim fades, and the checkmark draw are all suppressed and content renders in its final, visible state immediately

## Why

Once an order is placed the flow dead-ends at a static confirmation. Buyers
want to see *where their order is* — a live route from the warehouse to their
address, an ETA, and the pass-points it moves through. This turns the
post-purchase moment into an engaging, reassuring experience.

## What Changes

- After placing an order, the confirmation links to a new **Order Tracking**
  screen at `/track/:id`.
- The tracking screen shows an **SVG route schematic** (on-brand, zero new
  deps): warehouse origin → intermediate pass-points → the buyer's address,
  with the courier position advancing along the line.
- Live **ETA** and **progress** that update while the screen is open (TanStack
  Query polling), driven by **server-computed, deterministic** progress so it
  survives refresh and is consistent across devices.
- New **`GET /orders/:id`** endpoint returning the order, its delivery address,
  the ordered stops with per-stop ETAs, the current stop, overall status, and
  ETA — all derived from `createdAt` and a fixed (demo-compressed) timeline.
- **Order placement now captures a delivery address.** `POST /orders` accepts
  and persists a delivery address so tracking has a real destination; the
  checkout sends the address it already displays.
- Loading / not-found / error / success states for the tracking screen.

## Capabilities

### New Capabilities
- `order-tracking`: viewing a placed order's live delivery progress — route
  schematic of pass-points, ETA, current position, status, and polling updates,
  with full loading/not-found/error states.

### Modified Capabilities
- `cart-and-checkout`: order placement now includes and persists a delivery
  address in `POST /orders`, and the confirmation surfaces a path to tracking.

## Impact

- **Backend** (`apps/api`): Prisma `Order` gains delivery-address fields (schema
  migration + `db:push`); `POST /orders` accepts an `address`; new `GET
  /orders/:id` computes the deterministic timeline. `AppType` grows the new
  route — the typed client picks it up automatically.
- **Frontend** (`apps/web`): new `/track/:id` route + `TrackScreen`, a `useOrder`
  polling query hook, an SVG route component, the checkout sends `address`, and
  the confirm screen links to tracking.
- **Dependencies**: none added (SVG, not a map library).
- **Demo knob**: a `TRACKING_DURATION_MS` constant compresses the delivery to
  minutes so progress is visible during a session.

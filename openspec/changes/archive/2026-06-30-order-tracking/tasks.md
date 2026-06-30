## 1. Backend — data model & order placement

- [x] 1.1 Add nullable delivery-address fields to `Order` in `apps/api/prisma/schema.prisma` (`recipient`, `line1`, `city`, `postal`, `country`)
- [x] 1.2 Run `nx run api:db:push` to regenerate the Prisma client and sync the dev DB
- [x] 1.3 Extend `POST /orders` in `apps/api/src/main.ts` to accept an optional `address` object, validate its shape, and persist it on the created order

## 2. Backend — tracking endpoint

- [x] 2.1 Add a `TRACKING_DURATION_MS` constant (demo-compressed) and a fixed stop-offset table, with a `// ponytail:` calibration comment
- [x] 2.2 Add a pure `buildTimeline(createdAt, address, now)` helper returning `{ status, eta, stops: [{ label, etaAt, state }], currentIndex }`, deriving current stop from elapsed time and labelling pass-points from the address city
- [x] 2.3 Add `GET /orders/:id` returning id, total, address, status, eta, and stops; respond `404` for unknown ids
- [x] 2.4 Verify `AppType` exposes the new route to the typed client

## 3. Backend — tests

- [x] 3.1 Unit-test `buildTimeline`: deterministic output, current-stop advancement at offsets, and delivered end-state (extend `apps/api/src/orders.spec.ts` or a sibling spec)
- [x] 3.2 Test `GET /orders/:id`: known order returns address + stops, unknown id returns `404`
- [x] 3.3 Test `POST /orders` persists the address

## 4. Frontend — data layer

- [x] 4.1 Add a `useOrder(id)` hook in `apps/web/src/data/queries.ts` calling `api.orders[':id'].$get`, with `refetchInterval` (~5s) that returns `false` once status is `delivered`, and `NotFoundError` handling for `404`
- [x] 4.2 Send the delivery `address` in the `placeOrder` thunk (`apps/web/src/store/order-slice.ts`) using the address the checkout displays

## 5. Frontend — tracking screen

- [x] 5.1 Create `RouteSchematic` component: vertical SVG/box route of ordered stops with a connecting line, done/current/pending node treatments, courier marker at the current stop, and the address on the destination node — styled with theme tokens (squared, ink border, mono labels)
- [x] 5.2 Create `TrackScreen` (`apps/web/src/screens/track.tsx`) rendering `RouteSchematic` + ETA + "N of M stops passed" status
- [x] 5.3 Implement loading, not-found (link back to catalog), and error (retry) states on `TrackScreen`
- [x] 5.4 Add the `/track/:id` route to `apps/web/src/router.tsx`
- [x] 5.5 Add a "Track order" action linking to `/track/:id` on the confirm screen (`apps/web/src/screens/confirm.tsx`)

## 6. Frontend — tests & verification

- [x] 6.1 Component test for `TrackScreen`: renders stops/ETA on success, shows not-found on `404`, shows error+retry on failure (Vitest)
- [x] 6.2 E2e (`apps/web/e2e/`): place an order, land on confirm, follow "Track order", and assert the route schematic + ETA render
- [x] 6.3 Manual check in light + dark themes that the schematic matches the design system

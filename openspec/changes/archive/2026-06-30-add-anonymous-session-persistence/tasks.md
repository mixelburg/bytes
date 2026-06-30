> **Depends on `wire-saved-page`** (saved-items UI + slice) — apply that first. This change swaps the saved slice's persistence to the session and adds session/cart/order-history persistence. `POST /orders` here composes with `order-tracking`'s address capture.

## 1. Backend: data model

- [x] 1.1 Add `Session` model (`id` String @id, `cart` Json @default("[]"), `saved` Json @default("[]"), `createdAt`, `updatedAt`) to `apps/api/prisma/schema.prisma`
- [x] 1.2 Add nullable `sessionId String?` + `session Session?` relation to `Order`; add `@@index([sessionId])`
- [x] 1.3 Run `nx run api:db:push` to regenerate the client + sync schema

## 2. Backend: routes

- [x] 2.1 Add a `sessionId(c)` helper that reads the `x-session-id` header (returns `null` if absent)
- [x] 2.2 `GET /session` — upsert-on-read by id, return `{ cart, saved }`; empty `{ cart: [], saved: [] }` when no header
- [x] 2.3 `PUT /session` — body `{ cart?, saved? }`, upsert and overwrite provided blob(s); no-op when no header
- [x] 2.4 `GET /orders` — return the session's orders newest-first with items; empty array when no header
- [x] 2.5 In `POST /orders`, read the session id and stamp `sessionId` on the created order inside the existing transaction
- [x] 2.6 Keep the chained route style so `AppType` picks up the new routes

## 3. Frontend: session identity

- [x] 3.1 Add `apps/web/src/api/session.ts` with `getSessionId()` (read/mint UUID in `localStorage`)
- [x] 3.2 Pass a custom `fetch` to `hc()` in `api/client.ts` that injects the `x-session-id` header on every request

## 4. Frontend: persistence wiring (cart + saved)

- [x] 4.1 Add a `hydrateCart` reducer to `cart-slice.ts` that seeds `items` from a server `CartEntry[]`
- [x] 4.2 Bootstrap on app start: `GET /session` once, dispatch `hydrateCart(cart)` + `hydrateSaved(saved)`
- [x] 4.3 Add the single debounced `store.subscribe` writer (ref-equality skip on `cart.items`/`saved`, ~500ms) that `PUT /session { cart, saved }` — the only thing that writes the blob

## 5. Frontend: saved persistence (swap, not rebuild)

- [x] 5.1 Add a `hydrateSaved` reducer to the existing `saved-slice.ts` (from `wire-saved-page`)
- [x] 5.2 Remove the slice's `localStorage` read/write (persistence now flows through §4's session sync)
- [x] 5.3 Confirm the `/saved` screen and SAVED nav (owned by `wire-saved-page`) work unchanged against the session-hydrated set

## 6. Frontend: order history

- [x] 6.1 Add a `useOrders` TanStack Query hook (`['orders']` → `GET /orders`)
- [x] 6.2 Add the order-history screen with loading/empty/error states; wire the ME nav tab to it; link each row to `order-tracking`'s `/track/:id`
- [x] 6.3 Invalidate `['orders']` on `placeOrder.fulfilled` (checkout success)

## 7. Tests

- [x] 7.1 API: extend `orders.spec.ts` (or new `session.spec.ts`) — session upsert/read, cart+saved PUT round-trip, `GET /orders` scoped by header, order stamps `sessionId`
- [x] 7.2 Web: `saved-slice` unit test (toggle/hydrate/selector) and `getSessionId` mint-vs-reuse test
- [x] 7.3 E2e (Playwright): add to cart → reload → cart persists; save a product → appears on SAVED; place order → appears in history

## 8. Verify

- [x] 8.1 `nx test web` and `nx test api` pass; `nx serve api` + `nx dev web` exercise hydrate/persist by hand
- [x] 8.2 Confirm cart/saved/orders survive a hard reload for the same session and reset for a cleared `localStorage`

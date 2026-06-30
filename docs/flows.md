# Data Flows

All reads: `web → TanStack Query → hc client → Hono → Prisma → SQLite`. Writes go through RTK thunks or direct client calls. Every request carries an `x-session-id` header.

## Catalog browsing

Hooks in `apps/web/src/data/queries.ts`:

- `useCatalog()` — infinite query, page size 12. Params `page`, `limit`, `search`, `category`, `sort`. Returns `{ items, total, page, limit, hasMore }`.
- `useCategories()` — distinct categories, 5min stale.
- `useProduct(id)` — product + variants ordered by price.

Server `GET /products` (`main.ts:55`): `title` contains-search, exact category match, sort keys `newest | price-asc | price-desc | rating-desc`. Returns denormalized `priceMin/priceMax/totalStock` so no per-request aggregation.

## Cart

Redux `cart-slice.ts`. State: `items: Record<variantId, CartEntry>` (`CartSnapshot & { qty }`). Actions: `addItem`, `setQty`, `removeItem`, `clearCart`, `hydrateCart`. Selectors compute `selectCartLines` (per-line `price*qty`, `atMax`), `selectCartCount`, `selectSubtotal`, `selectShipping`, `selectTotal`. Cart clears automatically on `placeOrder.fulfilled`.

## Checkout / order placement

`order-slice.ts` thunk `placeOrder`:

1. Reads cart items from Redux.
2. `POST /orders { items: [{ variantId, quantity }], address }` — **client never sends price/stock**.
3. Server (`main.ts:173`) runs a transaction: fetch variants → validate stock → decrement `ProductVariant.stock` and `Product.totalStock` → create `Order` + `OrderItem`s (capturing price) → link to session via `connectOrCreate`.
4. Responses: `201` success, `409` insufficient stock, `400` invalid.
5. On success: invalidate `['orders']` cache, clear cart.

## Order tracking

`useOrder(id)` polls every 5s until `status === 'delivered'`. `GET /orders/:id` returns the order plus a deterministic timeline computed from `createdAt` + delivery city — no real carrier integration. History via `useOrders()` → `GET /orders` (newest first, max 100).

## Anonymous sessions

No login. `session.ts` `getSessionId()` mints a UUID on first load, caches it in `localStorage` under `bytes.sid`, falls back to an ephemeral UUID if storage is unavailable (private mode). Every client request sends it as `x-session-id`.

Server `Session { id, cart: Json, saved: Json, orders }`:
- `GET /session` — upsert-on-read; no header → `{ cart: [], saved: [] }`.
- `PUT /session { cart?, saved? }` — overwrites provided blobs.

**Sync** (`store/sync.ts`, `initSessionSync()`):
1. On startup, `GET /session` once → dispatch `hydrateCart()` + `hydrateSaved()`.
2. `store.subscribe()` with 500ms debounce → on cart/saved change, `PUT /session` with both arrays (`Object.values(cart.items)`, `saved.ids`).
3. Last-write-wins; dropped writes retry on next change. API down → start empty, browsing still works against cached catalog.

## Saved / favorites

`saved-slice.ts`. State `{ ids: number[] }`. Actions `toggleSaved`, `removeSaved`, `clearSaved`, `hydrateSaved`. Selectors `selectIsSaved(id)`, `selectSavedCount`. Persisted server-side inside `Session.saved` via the same sync path.

## Async state discipline

Every flow exposes loading / empty / error / success states (project non-negotiable). Reads inherit this from TanStack Query; writes from thunk `pending/fulfilled/rejected`.

## Why

The marketplace UI currently runs entirely on an in-memory mock (`apps/web/src/data/catalog.ts`) — a seeded 2,000-product catalog with `setTimeout`-delayed promises. A real Hono + Prisma backend (`apps/api`) now exists with typed routes and a generated `hc<AppType>` client, so the UI can read and write live data with end-to-end type safety. Wiring them together replaces the simulation with the real contract, exercises true pagination/persistence, and makes the cart/checkout authoritative on server-side price and stock.

## What Changes

- Replace the mock catalog data layer with the typed Hono RPC client (`apps/web/src/api/client.ts`). The query hooks call `api.products.$get`, `api.products[':id'].$get`, `api.categories.$get`, and `api.orders.$post`.
- **BREAKING (internal):** product identity moves from the mock's `Product` (`id: 'P1001'`, single `price`/`stock`) to the API shape (`id: number`, `title`, `priceMin`/`priceMax`, `image`, `inStock`). The list no longer carries an exact stock count.
- **BREAKING (internal):** the purchasable unit becomes the **variant**. The cart is re-keyed from product id → `variantId`; the detail screen gains variant selection; add-to-cart requires a chosen variant.
- Sort options change to the API's set: `price-asc`, `price-desc`, `rating-desc`, `newest` (replacing the mock's `popular`/`rating`).
- Pagination switches from cumulative client slicing to real `page`/`limit` offset paging; "Load more" accumulates pages via `useInfiniteQuery`.
- Order placement posts `{ items: [{ variantId, quantity }] }` to `/orders`; the UI handles server-authoritative outcomes: `201` success, `409` insufficient stock, `400` invalid, and network failure — all surfaced as recoverable states.
- Category tabs are sourced from `GET /categories` instead of a hardcoded list.
- Product imagery uses the API `image` field, with the striped tile retained as the loading/fallback state.
- Configuration: read `VITE_API_URL` (default `http://localhost:3001`); document running `apps/api` alongside `apps/web` in dev.
- Retire `apps/web/src/data/catalog.ts` (mock generator + fake API) once all reads/writes are on the real client.

## Capabilities

### New Capabilities
- `catalog-browsing`: the product list (search, category filter, sort, paginated "load more") and product detail are sourced from the Hono catalog endpoints, preserving loading / empty / error / success states.
- `cart-and-checkout`: a variant-based cart and an order-placement flow that posts to the API and reconciles with server-authoritative price and stock (including the insufficient-stock path).

### Modified Capabilities
<!-- None — openspec/specs/ is empty; this is the first spec'd behavior. -->

## Impact

- **Code:** `apps/web/src/data/queries.ts` (rewire to `api`), `apps/web/src/data/catalog.ts` (retire), `screens/list.tsx` (sort keys, pagination, categories, images), `screens/detail.tsx` (variant selection), `store/cart-slice.ts` (re-key to `variantId`, resolve product+variant for display), `store/order-slice.ts` (call `api.orders.$post`, map error codes), `app/layout.tsx` (cart count from variant lines), tests + e2e (mock/seed the API).
- **APIs:** consumes `@bytes/api` `AppType` via `hono/client`; depends on `apps/api` running in dev (CORS already enabled server-side).
- **Config/deps:** `VITE_API_URL` env; `@bytes/api` workspace dependency already present. No new runtime deps (TanStack Query, hono/client already installed).
- **Out of scope:** auth, payments, real image hosting, the `apps/api` schema/route design (owned by `add-product-variants`).

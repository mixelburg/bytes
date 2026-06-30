## Context

The web app (`apps/web`) was built frontend-first against a deterministic mock (`src/data/catalog.ts`): a seeded 2,000-product catalog and `setTimeout`-delayed `fetchPage`/`fetchProduct`/`placeOrderRequest`. TanStack Query owns reads; RTK owns cart + an order thunk. A Hono + Prisma backend (`apps/api`) now exposes typed routes and exports `AppType`; `apps/web/src/api/client.ts` already constructs `hc<AppType>`. The mock and the real API differ in three material ways: identifiers (`'P1001'` string vs `number`), the price/stock model (flat fields vs **variants** carrying price + stock), and pagination (cumulative slice vs offset `page`/`limit`). This change swaps the data layer while preserving the existing screens, theme, and four-state UX contract.

## Goals / Non-Goals

**Goals:**
- All catalog reads and order writes go through the typed `hc<AppType>` client — no parallel mock path, no manual fetch/codegen.
- Preserve the Mono Editorial UI and every loading/empty/error/success state already shipped.
- Make the cart variant-accurate and the order flow server-authoritative on price and stock.
- Keep the swap test-covered (unit + e2e) without a live backend in CI.

**Non-Goals:**
- Changing the `apps/api` schema or routes (owned by `add-product-variants`).
- Auth, real payments, image hosting/CDN, or offline write queueing.
- Server-side rendering or prefetch.

## Decisions

### 1. Consume the API only through the generated `hc<AppType>` client
Use the existing `apps/web/src/api/client.ts` everywhere; the query hooks call `api.products.$get({ query })`, `api.products[':id'].$get`, `api.categories.$get`, `api.orders.$post({ json })`. Response/request types flow from the backend with zero drift.
- *Alternative — hand-written fetch + local types:* rejected; duplicates the contract and rots silently when routes change.
- The hooks keep returning narrow, screen-shaped data so screens stay decoupled from the wire shape.

### 2. Pagination via `useInfiniteQuery`, keyed by the filter tuple
Replace the cumulative-slice `useQuery` with `useInfiniteQuery` keyed by `{ search, category, sort }`; `getNextPageParam` derives from the response `hasMore`/`page`. "Load more" calls `fetchNextPage`; the grid flattens `data.pages`. Changing any filter is a new query key, so pagination resets naturally.
- *Alternative — keep cumulative server slices:* the real API returns one page per request (offset), so the client must accumulate; `useInfiniteQuery` is the purpose-built fit.

### 3. Cart re-keyed to `variantId`; product/variant detail resolved for display
RTK `cart` becomes `Record<variantId, qty>` plus a small per-line snapshot (`title`, `optionsLabel`, `price`, `image`, `stock`, `productId`) captured at add-time so the cart and checkout render without N extra detail fetches. Totals use the snapshot price; the **server** still recomputes authoritative totals at `POST /orders`.
- *Alternative — store only `variantId` + qty and refetch each variant:* rejected; needless request fan-out and a flicker-prone cart. Snapshot is the pragmatic middle; stock conflicts are caught server-side at checkout regardless.

### 4. Order placement stays an RTK thunk, now calling the API
`placeOrder` thunk posts variant lines, then maps the result: `201` → success (id, total) + clear cart; `409` → `insufficientStock`; `400`/other non-2xx → `invalid`; rejection → `networkError`. The checkout screen renders each distinctly. On `409` we `queryClient.invalidateQueries(['catalog'])` so stock refreshes.
- *Alternative — TanStack `useMutation`:* viable, but cart/order state already lives in RTK and the brief favors RTK for writes; keeping one writer is simpler.

### 5. Images with striped-tile fallback
Render `<img src={image}>` inside the existing striped `Tile`; the stripe shows during load and on error (`onError` hides the img). Preserves the aesthetic and the empty-state look for missing images.

### 6. Test strategy: mock the client, don't run the backend
Unit/integration tests mock `apps/web/src/api/client.ts` (vi.mock) to return fixture pages/products/orders — fast, deterministic, no DB. E2e runs the real `apps/api` against a seeded SQLite test db via Playwright's `webServer` (start api + web), exercising the true contract end-to-end.
- *Alternative — MSW:* heavier setup than mocking the single client module for unit tests; revisit if we need network-level fidelity.

### 7. Retire the mock in one cut
Delete `src/data/catalog.ts` once `queries.ts`, the slices, and screens are on the client. Keep the shared formatting helpers (`money`, `shippingFor`, `stockColor`) by moving them to a `format.ts` util so they survive the deletion.

## Risks / Trade-offs

- **Cart snapshot can go stale** (price/stock changes between add and checkout) → server is authoritative at `POST /orders`; `409`/`400` paths reconcile and invalidate catalog queries.
- **Sort-key mismatch** (UI had `popular`/`rating`; API has `newest`/`rating-desc`) → adopt the API set exactly; "popular" is dropped, default becomes `newest`.
- **Dev now needs two processes** (`api` + `web`) → document `nx run-many -t serve` (or a compound script) and default `VITE_API_URL`; web shows the recoverable error state if the API is down rather than crashing.
- **e2e depends on a seeded db** → use a dedicated test database/seed and reset it in the Playwright global setup so runs are deterministic.
- **Variant UX is new surface** (detail picker, two-line same-product cart) → covered by new scenarios in `catalog-browsing` and `cart-and-checkout`.

## Migration Plan

1. Add `format.ts` (money/shipping/stockColor) and point existing screens at it (no behavior change).
2. Rewrite `queries.ts` onto `api` with `useInfiniteQuery` + `useProduct` + `useCategories`; adapt `list.tsx`/`detail.tsx` to the API shape behind the same UI.
3. Re-key `cart-slice` to `variantId` + snapshot; update `detail.tsx` add path and `cart.tsx` rendering.
4. Rewire `order-slice.placeOrder` to `api.orders.$post` with status mapping; update `checkout.tsx`.
5. Delete `catalog.ts`; update unit tests (mock client) and e2e (api `webServer` + seed).
6. Rollback: revert the branch — the mock layer is removed atomically in step 5, so partial states keep the mock until the final cut.

## Open Questions

- Does the list need a stock badge beyond `inStock`, or is boolean sufficient for v1? (Assume boolean; revisit if reviewers want "low stock".)
- Should "newest" or "rating-desc" be the default sort? (Proposed default: `newest`, matching the API default.)
- E2e seed ownership — does `apps/api` already expose a deterministic test seed, or do we add one here? (Confirm with `add-product-variants`.)

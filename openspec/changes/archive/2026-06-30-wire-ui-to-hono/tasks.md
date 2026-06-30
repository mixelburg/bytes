## 1. Groundwork

- [x] 1.1 Verify `apps/api` typechecks and serves locally (`nx serve api`); confirm `GET /health`, `/products`, `/categories`, `/products/:id`, `POST /orders` respond
- [x] 1.2 Confirm `@bytes/api` `AppType` resolves in `apps/web` and `apps/web/src/api/client.ts` is typed end-to-end
- [x] 1.3 Add `VITE_API_URL` to `apps/web` env docs (default `http://localhost:3001`); document running api + web together in dev
- [x] 1.4 Extract `money`, `shippingFor`, `stockColor` from `catalog.ts` into `apps/web/src/data/format.ts`; repoint imports (no behavior change)

## 2. Catalog reads (catalog-browsing)

- [x] 2.1 Rewrite `data/queries.ts`: `useCatalogPages` via `useInfiniteQuery` over `api.products.$get`, keyed by `{ search, category, sort }`, `getNextPageParam` from `hasMore`/`page`
- [x] 2.2 Add `useProduct(id)` via `api.products[':id'].$get` (variants included) and `useCategories()` via `api.categories.$get`
- [x] 2.3 Update `screens/list.tsx` to the API item shape (`id:number`, `title`, `priceMin`/`priceMax`, `image`, `inStock`); render price range; flatten `data.pages`
- [x] 2.4 Source category tabs from `useCategories()` (with leading "All"); replace hardcoded categories
- [x] 2.5 Replace sort options with API keys (`price-asc`, `price-desc`, `rating-desc`, `newest`); default `newest`
- [x] 2.6 Wire "Load more" to `fetchNextPage`; reflect `hasMore` and remaining count; keep end-of-list marker
- [x] 2.7 Render `<img>` (API `image`) inside the striped `Tile` with `onError` fallback to stripes
- [x] 2.8 Preserve loading (skeleton), empty (`total===0`), and recoverable error (retry) states on the list

## 3. Product detail with variants (catalog-browsing)

- [x] 3.1 Update `screens/detail.tsx` to `useProduct(id)`; render title/rating/description/image from the API record
- [x] 3.2 Add variant selection (by `optionsLabel`); preselect when a single variant; drive price/stock from the selected variant
- [x] 3.3 Disable add when the selected variant is sold out; keep loading skeleton and 404 "unavailable" state

## 4. Variant cart (cart-and-checkout)

- [x] 4.1 Re-key `store/cart-slice.ts` to `Record<variantId, qty>` with a per-line snapshot (`title`, `optionsLabel`, `price`, `image`, `stock`, `productId`)
- [x] 4.2 Update reducers/selectors (`addItem` takes a variant snapshot; `setQty` clamps to snapshot stock; lines/subtotal/total)
- [x] 4.3 Update `detail.tsx` add path to dispatch the selected variant snapshot; update `cart.tsx` to render variant label + per-line totals
- [x] 4.4 Update `app/layout.tsx` cart count to sum variant lines; keep empty-cart state

## 5. Order placement (cart-and-checkout)

- [x] 5.1 Rewrite `store/order-slice.ts` `placeOrder` thunk to `api.orders.$post({ json: { items: [{ variantId, quantity }] } })`
- [x] 5.2 Map outcomes: `201`→success (id,total)+clear cart; `409`→`insufficientStock`; `400`/other→`invalid`; reject→`networkError`
- [x] 5.3 On `409`, invalidate `['catalog']` queries so stock refreshes; keep cart intact
- [x] 5.4 Update `screens/checkout.tsx` to render placing/insufficient-stock/invalid/network states distinctly; confirm screen reads the API order id/total

## 6. Retire the mock & verify

- [x] 6.1 Delete `apps/web/src/data/catalog.ts`; remove all remaining imports of the mock
- [x] 6.2 Update unit/integration tests to `vi.mock` the api client with fixture pages/products/orders; cover add→cart→order + 409 path
- [x] 6.3 Update Playwright `webServer` to start `apps/api` (seeded test db) + `web`; reset/seed db in global setup; update e2e selectors for variants
- [x] 6.4 Run `nx typecheck web`, `nx test web`, `nx e2e web` green; manual smoke of all five screens against the live api (light + dark)

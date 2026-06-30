## Why

The mobile bottom nav advertises a `SAVED` tab, but it is a dead placeholder — no route, no handler, no state (`apps/web/src/app/layout.tsx:136`). Shoppers browsing a catalog of thousands of products have no way to set items aside for later, which is a baseline expectation for a marketplace.

## What Changes

- Add a client-side **saved set** (favorited product ids), persisted to `localStorage` so it survives reloads.
- Add a **save toggle** to product cards (and the product detail screen) that adds/removes a product from the saved set.
- Add a **`/saved` route + screen** listing saved products with the standard loading / empty / error / success states, reusing the catalog product-card presentation.
- **Wire the `SAVED` bottom-nav tab** (and any header entry) to navigate to `/saved` and reflect active state + a count badge.

## Capabilities

### New Capabilities
- `saved-items`: favoriting products into a locally-persisted set, toggling save state from cards/detail, and viewing saved products on a dedicated screen with full async states.

### Modified Capabilities
<!-- The save toggle lives on the catalog product card, but it does not change any
     existing catalog-browsing requirement (list/search/sort/pagination/detail behavior
     is unchanged). Saved state is owned by the new capability, so no delta is needed. -->

## Impact

- **State**: new Redux slice `saved` (product-id set) with `localStorage` persistence, mirroring the cart slice's persistence approach.
- **Routing**: new `/saved` route registered alongside `/cart`; `SAVED` nav item gains a `go`/`active`/count.
- **UI**: product card + detail gain a save control; new Saved screen component.
- **Data**: saved screen resolves ids to product records via the existing typed Hono client / TanStack Query (`GET /products`), so it degrades to an error state if the API is down.
- No backend changes (saved set is client-only for now).

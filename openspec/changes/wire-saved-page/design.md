## Context

The `SAVED` bottom-nav tab is a hardcoded placeholder (`apps/web/src/app/layout.tsx:136`) with no route or state. The app already has the pieces a Saved feature needs:

- **Store**: `configureStore` + `combineSlices` in `store/index.ts`, with `cart` and `order` slices. No persistence today.
- **Cart slice** (`store/cart-slice.ts`): `{ items: Record<number, CartEntry> }` with add/remove/clear actions and memoized selectors — the template to mirror.
- **Routes** (`router.tsx`): `/`, `/p/:id`, `/cart`, `/checkout`, `/confirm` under a layout with `<Outlet/>`.
- **Catalog data** (`data/queries.ts`): typed Hono RPC client (`api/client.ts`), `useCatalog()` (infinite), `useProduct(id)`, `useCategories()`. `ListItem` card shape = `{ id, title, priceMin, priceMax, rating, category, inStock, image }`.
- **Card**: rendered inline in `screens/list.tsx` (lines ~27–77), not extracted.
- **UI kit** (`components/ui.tsx`): `ProductImage`, `Mono`, `SquareButton`, `CenterState` (empty/error states), etc.

## Goals / Non-Goals

**Goals:**
- A `saved` slice keyed by product `id`, persisted to `localStorage`.
- A save toggle on the catalog card and product detail.
- A `/saved` screen with loading / empty / error / success states.
- `SAVED` nav tab wired to the route with active state + count.

**Non-Goals:**
- No backend / per-user sync — saved is client-only.
- No variant-level saving (a product is saved or not).
- No generic persistence framework (`redux-persist`) — one slice, hand-rolled.
- No cart persistence change (out of scope; cart stays in-memory).

## Decisions

**1. State shape: `{ ids: number[] }` in a `saved` slice.**
A plain id array (deduped on add) over `Record<number, true>` or `Set` — it serializes to `localStorage` directly, survives Redux's serializable-state check (a `Set` does not), and the sets are small (a person's saved list, not thousands). Actions: `toggleSaved(id)`, `removeSaved(id)`, `clearSaved`. Selectors: `selectSavedIds`, `selectSavedCount`, `selectIsSaved(id)`. Mirrors `cart-slice.ts` so it reads as a sibling.

*Alternative considered:* reuse the cart's `Record` shape — rejected, saved has no per-entry payload (no qty/price snapshot), so an id list is the honest model.

**2. Persistence: load `preloadedState` + a `store.subscribe` writer.** On store creation, read `localStorage['bytes.saved']`, parse defensively (try/catch → empty on failure), pass as `preloadedState.saved`. A `store.subscribe` writes `state.saved` back on change.
- *No new dependency* (`redux-persist` would be rung-4 overkill for one array).
- Defensive parse satisfies the "corrupt/missing storage" scenario.
- SSR-safe guard not needed (Vite SPA, `window` always present), but the read is wrapped anyway.

*Alternative considered:* a persistence middleware — same effect, more wiring than a subscribe for a single key.

**3. Save toggle reuses `SquareButton`; the card stays where it is.** Add a save control (a `♥`/`♡` glyph in a `SquareButton`, matching the existing `▢ +` quick-add) to the card in `screens/list.tsx`. The toggle calls `dispatch(toggleSaved(id))` and stops event propagation so it neither navigates to detail nor adds to cart.

*Card extraction:* the card is inline in `list.tsx` and also needed by `screens/saved.tsx`. Extract it into `components/product-card.tsx` so both screens render the same thing. This is the one structural refactor; it's load-bearing (two call sites), not speculative.

**4. Saved screen resolves ids → products via per-id `useQueries`.** Fan out one `GET /products/:id` per saved id with `@tanstack/react-query`'s `useQueries`, reusing the same `['product', id]` cache key as `useProduct` (so detail visits and the saved screen share cache). Map each `ProductDetail` to the card's `ListItem` shape (`priceMin/priceMax` = min/max of variant prices, `inStock` = any variant stock > 0). Loading = any query pending; error state = saved set non-empty and *all* queries errored (API down); a single 404'd id is skipped (stale), not surfaced as a global error.

*Revised from the original "filter `useCatalog`" plan:* the catalog endpoint has no `ids` filter and caps `limit` at 100, so a fresh `/saved` load only holds page 1 — saved items deeper in the catalog would silently vanish. Per-id fetch is correct at any depth and each id is individually cached; N small requests is the right trade for a personal-sized saved list.

**5. Nav wiring.** Give the `SAVED` item a `go: () => navigate('/saved')`, `active: onSaved` (pathname check like `onCart`), and a count from `selectSavedCount`. Mirrors the existing `CART` item exactly.

## Risks / Trade-offs

- **N requests for N saved items** (per-id fan-out). *Mitigation:* fine for a personal saved list (handful to dozens), each id individually cached and shared with the detail screen; upgrade path is a `GET /products?ids=` batch endpoint if saved lists grow large (`// ponytail:` comment marks the ceiling).
- **`localStorage` unavailable/full** (private mode quirks) → write throws. *Mitigation:* wrap read and write in try/catch; failure degrades to in-memory saved for the session, no crash.
- **Card refactor touches the list screen** → regression risk on the main catalog. *Mitigation:* extract verbatim first (pure move), then add the save control; covered by the existing list rendering.

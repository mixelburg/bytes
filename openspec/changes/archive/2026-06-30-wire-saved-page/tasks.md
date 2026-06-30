# Tasks

## 1. Saved state + persistence
- [x] 1.1 Add `store/saved-slice.ts`: state `{ ids: number[] }`, actions `toggleSaved`, `removeSaved`, `clearSaved`; selectors `selectSavedIds`, `selectSavedCount`, `selectIsSaved(id)` (mirror `cart-slice.ts`)
- [x] 1.2 Mount `saved` in `combineSlices` in `store/index.ts`
- [x] 1.3 In `makeStore()`, read `localStorage['bytes.saved']` (try/catch → `[]`) as `preloadedState.saved`, and add a `store.subscribe` that writes `state.saved.ids` back (try/catch)
- [x] 1.4 Unit test the slice (toggle adds/removes, idempotent add) and the load path (missing/corrupt storage → empty)

## 2. Reusable product card
- [x] 2.1 Extract the inline card from `screens/list.tsx` into `components/product-card.tsx` (pure move, no behavior change); update `list.tsx` to import it
- [x] 2.2 Add a save toggle (♥/♡ in a `SquareButton`) to the card reflecting `selectIsSaved(id)`; dispatch `toggleSaved(id)`; `stopPropagation` so it neither navigates nor adds to cart

## 3. Saved screen
- [x] 3.1 Add `screens/saved.tsx`: read `selectSavedIds`, resolve via per-id `useQueries` (`productQueryOptions`), map detail → card shape, skip 404s — `// ponytail:` notes the per-id ceiling
- [x] 3.2 Render success as a grid of `ProductCard`; remove-on-untoggle works via the slice
- [x] 3.3 Loading / empty / error states via `CenterState` — empty has a "start shopping" → `/` action; error (all ids failed) has retry
- [x] 3.4 Register `{ path: 'saved', element: <SavedScreen/> }` in `router.tsx`

## 4. Navigation wiring
- [x] 4.1 In `app/layout.tsx`, give the `SAVED` item `go: () => navigate('/saved')`, `active: onSaved` (pathname check), and count from `selectSavedCount`

## 5. Verify
- [x] 5.1 `nx test web` green (slice + load tests) + `nx typecheck web` clean
- [ ] 5.2 Manual/e2e: save from card → appears on `/saved` → reload persists → untoggle removes; API-down shows error state (needs running api+web stack)

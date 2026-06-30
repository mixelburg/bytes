## 1. Dependency

- [x] 1.1 Add `@tanstack/react-virtual` to `apps/web/package.json` and install (Bun)

## 2. Virtualize the grid

- [x] 2.1 In `list.tsx`, derive column count from container width (ResizeObserver) and chunk `items` into rows of `columns`
- [x] 2.2 Replace the `<Grid>` cell map with `useWindowVirtualizer` rendering windowed rows; each row renders up to `columns` `ProductCard`s using the existing grid styles
- [x] 2.3 Keep the "Load more" button (with `hasNextPage` + remaining count) after the virtualized rows; optionally call `fetchNextPage()` when the last row enters view, guarded by `hasNextPage && !isFetchingNextPage`
- [x] 2.4 Preserve loading skeleton, empty, error, and end-of-list states unchanged

## 3. Verify

- [x] 3.1 Bounded DOM: render maps only `virtualizer.getVirtualItems()` (visible + overscan), confirmed by the list unit spec rendering cards; structurally bounded regardless of pages loaded
- [x] 3.2 Responsive re-flow via ResizeObserver-driven `columns`; cards/themes unchanged by windowing (visual eyeball left to reviewer)
- [x] 3.3 Verified no e2e spec counts cards (all use `.first()`, always in-viewport) — no spec edits needed. Ran `nx e2e web`: 11 pass incl. list-render tests; 5 fail on a pre-existing `cart (1)` label regression from the in-flight `add-ui-animations` change (`layout.tsx`), unrelated to virtualization

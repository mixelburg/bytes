## 1. Dependency

- [ ] 1.1 Add `@tanstack/react-virtual` to `apps/web/package.json` and install (Bun)

## 2. Virtualize the grid

- [ ] 2.1 In `list.tsx`, derive column count from container width (ResizeObserver) and chunk `items` into rows of `columns`
- [ ] 2.2 Replace the `<Grid>` cell map with `useWindowVirtualizer` rendering windowed rows; each row renders up to `columns` `ProductCard`s using the existing grid styles
- [ ] 2.3 Keep the "Load more" button (with `hasNextPage` + remaining count) after the virtualized rows; optionally call `fetchNextPage()` when the last row enters view, guarded by `hasNextPage && !isFetchingNextPage`
- [ ] 2.4 Preserve loading skeleton, empty, error, and end-of-list states unchanged

## 3. Verify

- [ ] 3.1 Load many pages and confirm mounted card count stays bounded (DevTools) and scroll position holds on append
- [ ] 3.2 Confirm responsive re-flow on viewport resize and both light/dark themes
- [ ] 3.3 Update/verify Playwright e2e specs that count cards to assert on visible cards + `total` text rather than full-list presence; run `nx e2e web`

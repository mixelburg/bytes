## Context

`list.tsx` renders the catalog via `data.pages.flatMap(...).map(...)` into a single CSS grid (`repeat(auto-fill, minmax(150px, 1fr))`). Every item from every loaded page stays mounted. The catalog is specified to scale to thousands of products, so accumulating pages without windowing produces an unbounded DOM. Data already flows through TanStack Query's `useInfiniteQuery` (`useCatalog`), which we keep unchanged.

## Goals / Non-Goals

**Goals:**
- Bounded DOM: only visible rows (plus a small overscan) are mounted, independent of pages loaded.
- Preserve the existing responsive grid, all async states, and scroll position on append.
- Keep `useCatalog`/`useInfiniteQuery` and the API contract untouched.

**Non-Goals:**
- Replacing manual "Load more" with pure infinite scroll-on-view (we keep the button; optionally also trigger fetch near the end).
- Virtualizing other screens (saved, cart). Out of scope.
- Changing page size, sort, search, or filtering behavior.

## Decisions

**Use `@tanstack/react-virtual` over a hand-rolled windowing hook.**
It's the canonical, dependency-light (~no peer deps) windowing primitive, already in the TanStack family we use for Query, and handles dynamic measurement and overscan. Alternative `react-window`/`react-virtuoso` are heavier or grid-opinionated; a hand-rolled IntersectionObserver windower is more code to get scroll-restoration and resize right. ponytail: react-virtual is the higher rung — established dep, few lines to wire.

**Virtualize by row, not by cell.** The grid is responsive (`auto-fill`), so columns-per-row vary with viewport width. We compute `columns` from the container width (ResizeObserver via the virtualizer's element) and chunk `items` into rows of `columns`; the virtualizer measures rows. Each virtual row renders a grid of up to `columns` cards. This keeps the existing visual grid intact while windowing vertically (the only axis that grows).

**Use the window/page as the scroll element** (`useWindowVirtualizer`) since the list scrolls with the page, not an inner fixed-height scroll container. Avoids forcing a fixed-height scroll box that would fight the current full-page layout.

**Keep the explicit "Load more" button.** It already reflects `hasNextPage` and remaining count. We render it after the virtualized rows. Optionally call `fetchNextPage()` when the last row becomes visible, guarded by `hasNextPage && !isFetchingNextPage`.

## Risks / Trade-offs

- [Estimated row height wrong → scroll jump] → cards have fixed `aspectRatio: 1` plus known label height, so estimate is stable; react-virtual remeasures real rows on mount.
- [Column count recompute on resize causes re-chunk/re-render] → cheap (chunking is O(n) over the in-memory array) and only fires on width change.
- [Windowing breaks e2e selectors that assume all cards in DOM] → update/verify Playwright specs that count cards; assert on `total` text and visible cards rather than full-list presence.

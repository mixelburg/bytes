## Why

The product list accumulates every loaded page into a single CSS grid and renders all items as live DOM nodes (`list.tsx` `items.map`). With a catalog meant to scale to thousands of products, repeated "Load more" leaves thousands of card nodes mounted, degrading scroll and layout performance on mobile. The list needs windowing so only visible rows are in the DOM.

## What Changes

- Virtualize the product grid so off-screen rows are not rendered, keeping DOM size bounded regardless of how many pages are loaded.
- Drive "Load more" from the virtualizer (fetch the next page as the user nears the end) while preserving the existing manual button as the trigger and `hasMore`/remaining-count display.
- Preserve current behavior: grid layout (`auto-fill, minmax(150px, 1fr)`), loading/empty/error/end states, scroll position on append.
- Add `@tanstack/react-virtual` as a dependency.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `catalog-browsing`: the "Paginated load-more" requirement gains a virtualization constraint — accumulated pages SHALL be rendered through a windowed list so DOM node count stays bounded as pages accumulate.

## Impact

- `apps/web/src/screens/list.tsx` — grid rendering switches to a virtualized container.
- `apps/web/package.json` — adds `@tanstack/react-virtual`.
- No API, schema, or backend changes.

# catalog-browsing Specification

## Purpose
TBD - created by archiving change wire-ui-to-hono. Update Purpose after archive.
## Requirements
### Requirement: Product list sourced from the catalog API
The product list SHALL be populated from `GET /products` via the typed Hono client, passing the current `search`, `category`, `sort`, `page`, and `limit` as query parameters. The UI SHALL render each item using the API shape (`id`, `title`, `category`, `image`, `rating`, `priceMin`, `priceMax`, `inStock`).

#### Scenario: Initial load
- **WHEN** the list screen mounts with no filters
- **THEN** the UI requests `GET /products?page=1&limit=<n>` and renders the returned items with title, price, rating, category, and image

#### Scenario: Price range display
- **WHEN** a product's `priceMin` differs from its `priceMax`
- **THEN** the card shows a range (e.g. "$54–$98"); otherwise it shows the single price

#### Scenario: Sold-out item
- **WHEN** an item's `inStock` is false
- **THEN** the card shows the SOLD OUT treatment and hides the quick-add control

### Requirement: Search and category filtering via the API
Search input and category selection SHALL drive the API query, not client-side filtering. The category list SHALL be sourced from `GET /categories` (plus an "All" option) rather than hardcoded. The `search` term SHALL be split into whitespace-separated words; a product matches only when EVERY word is found (case-insensitive, prefix match) in at least one of its `title`, `description`, or `category` fields. Search SHALL remain performant at catalog sizes of ~100k products (backed by a full-text index, not full-table scans).

#### Scenario: Search narrows results
- **WHEN** the user types a search term (debounced)
- **THEN** the UI requests `GET /products?search=<term>&page=1` and replaces the grid with the response, resetting pagination

#### Scenario: Multi-word search matches across words and fields
- **WHEN** a search like `red shoes` is submitted and a product has `red` in its title and `shoes` in its category (or description)
- **THEN** that product is returned, even though the exact phrase `red shoes` appears in no single field

#### Scenario: Prefix matching
- **WHEN** a partial word like `sho` is submitted
- **THEN** products with a word starting `sho` (e.g. `shoes`) are returned

#### Scenario: Search combines with category and sort
- **WHEN** a search term is submitted together with a category and a sort key
- **THEN** results are restricted to that category, ordered by the sort key, paginated unchanged (response shape `items/total/page/limit/hasMore`)

#### Scenario: Category tabs come from the API
- **WHEN** the list screen loads
- **THEN** the category tabs are built from `GET /categories` with a leading "All" tab

#### Scenario: No results
- **WHEN** a search or filter yields `total === 0`
- **THEN** the UI shows the empty state with a "clear filters" action that resets search and category

### Requirement: Sorting uses the API sort keys
The sort control SHALL offer exactly the API-supported keys (`price-asc`, `price-desc`, `rating-desc`, `newest`) and pass the chosen key to `GET /products?sort=`.

#### Scenario: Sort changes ordering
- **WHEN** the user selects "Price · Low to high"
- **THEN** the UI requests `GET /products?sort=price-asc&page=1` and re-renders from the response

### Requirement: Paginated load-more
The list SHALL page through results with `page`/`limit` offsets and accumulate pages client-side so "Load more" appends without losing earlier items. The control SHALL reflect `hasMore` and the remaining count.

#### Scenario: Load more appends
- **WHEN** the user activates "Load more" and `hasMore` is true
- **THEN** the UI requests the next `page`, appends its items below the current grid, and keeps scroll position

#### Scenario: End of results
- **WHEN** `hasMore` is false
- **THEN** the UI hides "Load more" and shows an end-of-list marker with the total count

### Requirement: Product detail with variants
The detail screen SHALL load a product from `GET /products/:id` (including its `variants`) and let the user choose a variant before adding to cart. Rating, review/availability info, and description SHALL reflect the API record.

#### Scenario: Variant selection
- **WHEN** a product has more than one variant
- **THEN** the UI presents the variant options (by `optionsLabel`) and the displayed price/stock follow the selected variant

#### Scenario: Single default variant
- **WHEN** a product has exactly one variant
- **THEN** that variant is preselected and no variant picker is required

#### Scenario: Add requires an in-stock variant
- **WHEN** the selected variant has `stock === 0`
- **THEN** the add control is disabled and the variant is shown as sold out

### Requirement: Async states for all catalog reads
Every catalog read (list, detail, categories) SHALL render distinct loading, error, and success states with no dead ends.

#### Scenario: Loading
- **WHEN** a catalog request is in flight with no cached data
- **THEN** the UI shows skeleton/striped placeholders

#### Scenario: Error is recoverable
- **WHEN** a catalog request fails (network or non-2xx)
- **THEN** the UI shows an error state with a retry action that re-issues the request

#### Scenario: Not found
- **WHEN** `GET /products/:id` returns 404
- **THEN** the detail screen shows a "product unavailable" state with a path back to the list


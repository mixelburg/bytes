## MODIFIED Requirements

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

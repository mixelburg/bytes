## MODIFIED Requirements

### Requirement: Paginated load-more
The list SHALL page through results with `page`/`limit` offsets and accumulate pages client-side so "Load more" appends without losing earlier items. The control SHALL reflect `hasMore` and the remaining count. Accumulated items SHALL be rendered through a windowed (virtualized) container so that the number of mounted product nodes stays bounded by the visible viewport (plus a small overscan), regardless of how many pages have been loaded.

#### Scenario: Load more appends
- **WHEN** the user activates "Load more" and `hasMore` is true
- **THEN** the UI requests the next `page`, appends its items below the current grid, and keeps scroll position

#### Scenario: End of results
- **WHEN** `hasMore` is false
- **THEN** the UI hides "Load more" and shows an end-of-list marker with the total count

#### Scenario: Bounded DOM under many pages
- **WHEN** many pages have been loaded (e.g. the user activates "Load more" repeatedly)
- **THEN** only the rows within (or near) the viewport are mounted in the DOM, and off-screen product cards are not rendered, keeping the mounted node count roughly constant as more pages accumulate

#### Scenario: Responsive grid preserved while windowed
- **WHEN** the viewport width changes the number of columns the grid can fit
- **THEN** the virtualized list re-flows to the new column count and continues to render the existing responsive grid layout

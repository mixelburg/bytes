# saved-items Specification

## Purpose
TBD - created by archiving change wire-saved-page. Update Purpose after archive.
## Requirements
### Requirement: Save toggle on product surfaces
Each product card in the catalog list and the product detail screen SHALL expose a save control that reflects current saved state and toggles it. The control SHALL be operable independently of the add-to-cart action and SHALL NOT navigate away.

#### Scenario: Toggle on
- **WHEN** the user activates the save control on an unsaved product
- **THEN** the product id is added to the saved set and the control shows the saved state

#### Scenario: Toggle off
- **WHEN** the user activates the save control on a saved product
- **THEN** the product id is removed from the saved set and the control shows the unsaved state

#### Scenario: Save does not trigger navigation or add-to-cart
- **WHEN** the user activates the save control on a card
- **THEN** only the saved state changes — the app does not open the detail screen or add to cart

### Requirement: Saved screen with full async states
A `/saved` screen SHALL list the saved products, resolving saved ids to product records via the catalog API. The screen SHALL expose loading, empty, error, and success states.

#### Scenario: Loading
- **WHEN** the saved screen mounts with a non-empty saved set and product data is in flight
- **THEN** the screen shows a loading treatment

#### Scenario: Success
- **WHEN** product records for the saved ids resolve
- **THEN** the screen renders one entry per saved product using the catalog card presentation (title, price, rating, image), each with a save control that removes it

#### Scenario: Remove from saved screen
- **WHEN** the user un-saves a product from the saved screen
- **THEN** that entry is removed from the list and the saved count decrements

#### Scenario: Empty
- **WHEN** the saved set is empty
- **THEN** the screen shows an empty state with a "start shopping" action that navigates to the catalog

#### Scenario: Error
- **WHEN** resolving saved products fails (e.g. the API is down)
- **THEN** the screen shows an error state with a retry action and does not lose the saved set

#### Scenario: Stale saved id
- **WHEN** a saved id no longer resolves to an existing product
- **THEN** that id is skipped in the list (not rendered as a broken entry)

### Requirement: Saved navigation wiring
The `SAVED` bottom-nav tab SHALL navigate to `/saved`, reflect active state when that route is shown, and display the saved count when greater than zero.

#### Scenario: Navigate to saved
- **WHEN** the user taps the `SAVED` tab
- **THEN** the app navigates to `/saved` and the tab renders as active

#### Scenario: Count badge
- **WHEN** the saved set has one or more items
- **THEN** the `SAVED` tab shows the count, and shows none when the set is empty

### Requirement: Session-persisted saved set
The app SHALL maintain a set of saved product ids in Redux and persist it to the backend, scoped to the anonymous session (see the `anonymous-session` capability), rehydrating from the server on load. The saved set SHALL ride the same `PUT /session` blob as the cart and SHALL NOT use `localStorage`. Saving SHALL be keyed by product `id` (not `variantId`) — a product is saved or not, regardless of variant.

#### Scenario: Save persists across reload
- **WHEN** the user saves a product and reloads the app
- **THEN** the saved set is rehydrated from `GET /session` for the current session and that product is still saved

#### Scenario: Saving is idempotent
- **WHEN** the user saves a product that is already saved
- **THEN** the saved set is unchanged (no duplicate entry)

#### Scenario: Saved changes are written back
- **WHEN** the user toggles a product's saved state
- **THEN** the saved set is written back to the server (debounced, via the shared `PUT /session`)

#### Scenario: No session / API down on load
- **WHEN** the saved set cannot be loaded from the server (no session id yet or the API is down)
- **THEN** the app starts with an empty saved set without crashing


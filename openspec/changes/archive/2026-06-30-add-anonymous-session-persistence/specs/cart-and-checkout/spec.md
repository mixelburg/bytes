## MODIFIED Requirements

### Requirement: Variant-based cart
The cart SHALL key line items by `variantId` (not product id). Adding an item SHALL require a resolved variant; quantity changes SHALL be clamped to the variant's known `stock`. The cart SHALL persist server-side, scoped to the anonymous session: it is hydrated from the server on load and written back (debounced) on change, so it survives reloads. Redux remains the in-memory working copy; the server is authoritative on price and stock only at order time.

#### Scenario: Add a variant
- **WHEN** the user adds a selected in-stock variant from the detail screen
- **THEN** a cart line keyed by that `variantId` is created (or its quantity incremented), capped at the variant stock

#### Scenario: Distinct variants are distinct lines
- **WHEN** two different variants of the same product are added
- **THEN** the cart holds two separate lines, each with its own quantity and price

#### Scenario: Quantity guard
- **WHEN** the user increases a line's quantity to the variant's stock limit
- **THEN** further increment is blocked and the line shows a "max stock reached" hint

#### Scenario: Remove a line
- **WHEN** the user removes a line
- **THEN** that `variantId` is dropped from the cart and totals recompute

#### Scenario: Cart survives reload
- **WHEN** the user adds items and reloads the app
- **THEN** the cart is rehydrated from the server for the current session with the same lines and quantities

#### Scenario: Cart changes persist
- **WHEN** the user changes the cart (add, set quantity, remove, clear)
- **THEN** the change is written back to the server for the current session (debounced), last-write-wins

<!-- NOTE: "Order placement via the API" is intentionally NOT modified here.
     The change `order-tracking` owns that requirement's delta (delivery address +
     "track order" link). Session attribution of placed orders lives in this
     change's `order-history` capability ("Orders attach to the session"), which
     composes with order-tracking's address capture on the same POST /orders. -->


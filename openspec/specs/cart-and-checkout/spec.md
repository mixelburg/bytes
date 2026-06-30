# cart-and-checkout Specification

## Purpose
TBD - created by archiving change wire-ui-to-hono. Update Purpose after archive.
## Requirements
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

### Requirement: Cart display and totals
Cart lines SHALL display product title, variant label, unit price, and line total resolved from the API records, and the cart SHALL compute subtotal, shipping, and total. Server-provided prices are the display source of truth.

#### Scenario: Totals recompute
- **WHEN** any line quantity changes
- **THEN** subtotal, shipping, and total update consistently with the per-line prices

#### Scenario: Empty cart
- **WHEN** the cart has no lines
- **THEN** the cart screen shows an empty state with a "start shopping" action

### Requirement: Order placement via the API
Checkout SHALL place an order by posting `{ items: [{ variantId, quantity }], address }` to `POST /orders`, where `address` is the delivery address the checkout displays. The UI SHALL never send price or totals — the server is authoritative. The server SHALL persist the delivery address on the order so it can be tracked. The placement flow SHALL expose placing, success, and error states, and the success confirmation SHALL offer a path to track the order.

#### Scenario: Successful order
- **WHEN** the user places an order and the API returns `201`
- **THEN** the UI shows the confirmation with the returned order id and total, clears the cart, and offers a "track order" action to `/track/:id`

#### Scenario: Address persisted
- **WHEN** an order is placed with a delivery address
- **THEN** the server stores the address on the order and `GET /orders/:id` returns it

#### Scenario: Placing indicator
- **WHEN** the request is in flight
- **THEN** the place-order control is disabled and shows a progress indicator

### Requirement: Server-authoritative failure handling
The checkout SHALL map non-success responses to recoverable states without losing the cart, and SHALL surface insufficient-stock distinctly from generic failures.

#### Scenario: Insufficient stock
- **WHEN** `POST /orders` returns `409` (a variant lacks stock)
- **THEN** the UI shows a stock-conflict message, keeps the cart intact, and invalidates catalog/stock data so the user can adjust

#### Scenario: Invalid request
- **WHEN** `POST /orders` returns `400`
- **THEN** the UI shows a generic "couldn't place order" message and keeps the cart

#### Scenario: Network failure
- **WHEN** the request rejects (network/timeout)
- **THEN** the UI shows the error banner ("No charge was made — please try again") and the user can retry


## MODIFIED Requirements

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

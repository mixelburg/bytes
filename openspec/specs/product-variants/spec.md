# product-variants Specification

## Purpose

Define how products own purchasable variants, where price and stock live at the variant level, and how product listing, detail, cart, and order placement reference and validate variants.

## Requirements

### Requirement: Product owns one or more variants

A product SHALL be a catalog entry (title, description, category, rating, hero image) that owns at least one purchasable `ProductVariant`. Price and stock SHALL live on the variant, not the product. A product with no declared options SHALL still have exactly one default variant.

#### Scenario: Multi-option product has multiple variants

- **WHEN** a clothing product is created with sizes S/M/L and colors red/blue
- **THEN** it has one variant per option combination, each with its own price and stock

#### Scenario: Single-variant product gets a default variant

- **WHEN** a product is created without options
- **THEN** it has exactly one variant whose options map is empty and whose label is empty

### Requirement: Variant carries options, price, and stock

Each `ProductVariant` SHALL store an `options` key→value map (e.g. `{"size":"M","color":"Red"}`), a human-readable `optionsLabel` derived from it, a non-negative `price`, a non-negative integer `stock`, and an `image`. The system SHALL NOT use normalized option tables.

#### Scenario: Variant exposes its options

- **WHEN** a variant for size M / color Red is read
- **THEN** its `options` equals `{"size":"M","color":"Red"}` and its `optionsLabel` is a display string such as `"M / Red"`

### Requirement: Product list returns price range and availability

The `GET /products` endpoint SHALL return, per product, the minimum and maximum variant price (`priceMin`, `priceMax`) and an `inStock` flag that is true when any variant has stock greater than zero. The list SHALL compute these without issuing one query per product (no N+1).

#### Scenario: Price range spans variant prices

- **WHEN** a product has variants priced 19.99 and 24.99
- **THEN** the list entry reports `priceMin` 19.99 and `priceMax` 24.99

#### Scenario: Availability reflects variant stock

- **WHEN** every variant of a product has stock 0
- **THEN** the list entry reports `inStock` false

### Requirement: Product detail returns the full variant list

The `GET /products/:id` endpoint SHALL include the product's variants, each with id, options, optionsLabel, price, stock, and image, so a client can render a variant selector.

#### Scenario: Detail includes selectable variants

- **WHEN** a product with three variants is requested
- **THEN** the response includes a `variants` array of length three with price and stock per entry

### Requirement: Cart and orders reference a variant

The cart and order placement SHALL identify line items by `variantId`, not `productId`. `POST /orders` SHALL accept items of shape `{ variantId, quantity }`. Each resulting `OrderItem` SHALL record the `variantId` and the variant's unit price at purchase time.

#### Scenario: Order placed against a specific variant

- **WHEN** an order is placed for `{ variantId: V, quantity: 2 }`
- **THEN** an order is created with one item recording variant V, quantity 2, and V's current unit price

#### Scenario: Order rejects an unknown variant

- **WHEN** an order references a variantId that does not exist
- **THEN** the request is rejected with a 400 error and no order is created

### Requirement: Stock is validated and decremented per variant

Order placement SHALL validate available stock at the variant level using server-side values (never client-supplied price or stock) and SHALL decrement each ordered variant's stock within a single transaction. If any variant has insufficient stock, the whole order SHALL fail.

#### Scenario: Insufficient variant stock blocks the order

- **WHEN** an order requests quantity 5 of a variant that has stock 3
- **THEN** the request is rejected with a 409 error and no variant stock is decremented

#### Scenario: Successful order decrements variant stock

- **WHEN** an order for quantity 2 of a variant with stock 10 succeeds
- **THEN** that variant's stock becomes 8

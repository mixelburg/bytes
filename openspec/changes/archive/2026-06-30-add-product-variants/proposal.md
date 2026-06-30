## Why

Today a `Product` is a single purchasable unit with one price and one stock count. Real marketplace items (a T-shirt in S/M/L × red/blue, a phone in 128/256 GB) are one catalog entry with several purchasable variants, each with its own price, stock, and image. Without variants we can't model inventory correctly, the cart can't reference what the buyer actually selected, and orders can't record it.

## What Changes

- Introduce a `ProductVariant` as the purchasable unit. A `Product` becomes the catalog-level entry (title, description, category, rating, hero image) and owns one or more variants.
- **BREAKING**: `price` and `stock` move from `Product` to `ProductVariant`. Every product has at least one variant (single-variant products get a default).
- Variant options (size, color, …) are stored as a small key→value map on the variant, with a human label — **no normalized Option/OptionValue tables** (over-engineering for a few options per product).
- **BREAKING**: the cart and orders reference `variantId` instead of `productId`. `OrderItem` captures the variant and its purchase-time price.
- Product list returns a **price range** (min–max across variants) and total available stock; product detail returns the full variant list so the UI can render a selector.
- Stock is decremented per variant on order placement; the existing insufficient-stock guard moves to variant granularity.
- Seed generates real-world variants (sizes/colors) from the fetched product data.

## Capabilities

### New Capabilities
- `product-variants`: modeling a product as a catalog entry with multiple purchasable variants — variant options, per-variant price and stock, price-range listing, variant-level selection in cart, and variant-accurate order placement.

### Modified Capabilities
<!-- None — no existing specs in openspec/specs/ yet. -->

## Impact

- **DB schema** (`apps/api/prisma/schema.prisma`): new `ProductVariant` model; `price`/`stock` removed from `Product`; `OrderItem.productId` → `variantId`.
- **Seed** (`apps/api/prisma/seed.ts`): expand each real product into 1–N variants.
- **API** (`apps/api/src/main.ts`): `/products` returns price range + stock summary; `/products/:id` includes `variants[]`; `POST /orders` accepts `{ variantId, quantity }` and decrements variant stock.
- **Typed client**: `AppType` updates flow automatically to `apps/web` via Hono RPC — no codegen.
- **Frontend** (`apps/web`): future variant selector on the detail screen; cart keyed by `variantId`. (UI not yet built — minimal surface today.)

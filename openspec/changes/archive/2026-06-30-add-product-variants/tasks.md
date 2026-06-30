## 1. Schema

- [x] 1.1 Add `ProductVariant` model (`id`, `productId`, `options` Json, `optionsLabel`, `price`, `stock`, `image`); fall back to `String` JSON if Prisma rejects `Json` on SQLite.
- [x] 1.2 Remove `price` and `stock` from `Product`; add `variants ProductVariant[]` relation; keep index on `category`.
- [x] 1.3 Repoint `OrderItem` from `productId` to `variantId` (relation to `ProductVariant`), keep `price` snapshot.
- [x] 1.4 `bunx prisma db push` (dev, destructive) and regenerate client.

## 2. Seed

- [x] 2.1 For apparel categories, expand each product into size × color variants; all others get one default variant (empty options).
- [x] 2.2 Jitter price per variant off the product base price; assign per-variant stock; derive `optionsLabel`.
- [x] 2.3 Reseed and confirm variant counts (e.g. apparel products have >1 variant, others exactly 1).

## 3. API reads

- [x] 3.1 `GET /products`: add `priceMin`, `priceMax`, `inStock` — via denormalized columns on `Product` (see design Decision 3, revised) so global price sort works without N+1 or raw SQL.
- [x] 3.2 Support `sort=price-asc|price-desc` ordering over `priceMin`.
- [x] 3.3 `GET /products/:id`: include `variants[]` (id, options, optionsLabel, price, stock, image).

## 4. API writes

- [x] 4.1 `POST /orders`: accept `{ variantId, quantity }[]`; validate shape (400 on invalid/empty).
- [x] 4.2 In the transaction, load referenced variants; 400 on unknown variantId, 409 on insufficient per-variant stock.
- [x] 4.3 Snapshot variant unit price into `OrderItem.price`; decrement each variant's stock (and product `totalStock`); return created order.

## 5. Typed client + verify

- [x] 5.1 Confirm `AppType` changes propagate (api + web `tsc --noEmit` clean, no `any`).
- [x] 5.2 Smoke test: list shows price range + `inStock`; detail returns variants; order against a variant decrements its stock; insufficient stock → 409; unknown variant → 400.
- [x] 5.3 Add/update a Vitest covering variant order placement (success decrement + insufficient-stock guard).

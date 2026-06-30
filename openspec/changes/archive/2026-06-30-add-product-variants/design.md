## Context

The backend (`apps/api`, Hono + Prisma + SQLite) currently models a `Product` as one purchasable unit: `price` and `stock` live directly on it, and `OrderItem` points at `productId`. Real catalog items have variants (size, color, capacity). The frontend (`apps/web`) is not built yet, so the cart/order contract can change freely now at near-zero cost — the right time to introduce variants before UI locks the shape in. The typed Hono RPC client means any API type change surfaces in the web app as a compile error, not silent drift.

## Goals / Non-Goals

**Goals:**
- Model a product as a catalog entry owning ≥1 purchasable variant with its own price, stock, image, and options.
- Make inventory, cart, and orders variant-accurate.
- List view stays cheap at thousands of products (price range + stock without N+1 fan-out).
- Keep the data model minimal — no speculative option machinery.

**Non-Goals:**
- Normalized Option / OptionValue / option-combination tables.
- Variant-level rating/reviews (rating stays product-level).
- Per-variant discounts, price history, or multi-warehouse stock.
- Building the variant-selector UI (separate change once the web app exists).

## Decisions

**1. `ProductVariant` is the purchasable unit; `Product` is the catalog entry.**
`price` and `stock` move off `Product` onto `ProductVariant`. Product keeps title, description, category, rating, hero image. Every product has at least one variant — single-variant products get a default (options `{}`). This keeps one code path: the cart/order *always* references a variant, never a bare product.
_Alternative considered:_ optional variants (price/stock stay on product, variants override). Rejected — two code paths (with/without variants) for every read and the stock check; more branching than a default variant.

**2. Options as a JSON map + denormalized label, not relational tables.**
`ProductVariant.options` is `Json` (e.g. `{"size":"M","color":"Red"}`) plus `optionsLabel` (`"M / Red"`) for cheap display and search. A few options per product don't justify Option/OptionValue/junction tables — that's the over-engineered shape large platforms need for faceted option filtering, which is a non-goal here.
_Alternative considered:_ relational option tables. Rejected as YAGNI for this scope; revisit only if we need per-option facet filtering.
_ponytail:_ Prisma `Json` on SQLite — if the installed Prisma rejects it, fall back to `String` holding JSON and parse in the handler.

**3. Denormalize `priceMin`/`priceMax`/`totalStock` onto `Product`.**
The list needs a **global** `price-asc/desc` sort (brief requirement), not just a per-page range. A `groupBy` over the page's product ids can show the range but can't order the full set by price — you'd only sort within a page. Storing `priceMin`, `priceMax`, and `totalStock` on `Product` makes the list a plain typed `findMany` with `orderBy: { priceMin }` — global sort, no N+1, no raw SQL. `inStock` is `totalStock > 0` in the response.
Upkeep is cheap: prices never change (no price-edit endpoint), so the columns are set once at seed time; only `totalStock` needs decrementing, which happens in the same order transaction that decrements variant stock.
_Alternative considered:_ per-page `groupBy` aggregate (original plan). Rejected — cannot satisfy global price sort. _Alternative considered:_ raw SQL with `JOIN ... GROUP BY ... ORDER BY MIN(price)`. Rejected — more code, untyped result, violates the no-`any` rule for marginal benefit.

**4. Order placement decrements variant stock inside the existing transaction.**
`POST /orders` accepts `{ variantId, quantity }[]`. The transaction loads the referenced variants, validates stock per variant (authoritative server-side, as today), decrements each, and snapshots unit price into `OrderItem.price`. The insufficient-stock 409 guard moves from product to variant granularity.

**5. Seed expands real products into variants.**
Apparel categories (clothing/shoes) get size × color variants; others get a single default variant. Prices jitter per variant off the base; stock is per variant. Real fetched data stays the source of truth for catalog fields.

## Risks / Trade-offs

- **[Breaking change to cart/order contract]** → Frontend isn't built, so blast radius is the seed, API, and one typed-client file; the compiler catches consumers. Land before UI work starts.
- **[Aggregate query for price range adds a second query per list page]** → Bounded to one `groupBy` over ~20 product ids per page; negligible. Denormalize onto `Product` only if profiling says so (Decision 3).
- **[Prisma `Json` support on SQLite varies by version]** → Fallback to `String` JSON (Decision 2); handler parses. One-line change if needed.
- **[Existing seeded DB has old schema]** → `prisma db push` + reseed (dev only, no real data). No production migration to manage.

## Migration Plan

1. Update `schema.prisma`: add `ProductVariant`, remove `price`/`stock` from `Product`, repoint `OrderItem` to `variantId`.
2. `bunx prisma db push` (dev DB, destructive — acceptable, no real data).
3. Update seed to emit variants; `bunx prisma db seed`.
4. Update `main.ts` read/write handlers; `AppType` propagates to the typed client.
5. Rollback: revert schema + handlers, `db push`, reseed. No data to preserve.

## Open Questions

- `inStock` boolean vs. summed `totalStock` in the list payload? Lean boolean (cheaper, enough for a list badge); detail screen shows real per-variant numbers.
- Default sort still by product `createdAt`; do we ever sort the list by `priceMin`? Add `price-asc/desc` over the aggregate if the UI needs it — likely yes, so wire it.

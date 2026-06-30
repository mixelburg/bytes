# Architecture

Nx monorepo, Bun workspaces. Web and API share types via the Hono `hc<AppType>` client (zero codegen).

## Layout

```
apps/web        React + Vite frontend (also Capacitor web root)
apps/api        Hono + Prisma backend (SQLite)
libs/           empty — future shared code
openspec/       OpenSpec change proposals (specs + tasks)
android/        Capacitor Android shell (Gradle)
deploy/         Dockerfiles, compose, entrypoint, nginx conf
dist/apps/web   Vite build output, consumed by Capacitor
```

Root files: `package.json`, `nx.json`, `tsconfig.base.json`, `capacitor.config.ts`, `biome.json`.

## apps/web

**Entry** `main.tsx` wires Redux store, React Query, Router, MUI/styled-components theme, and calls `initSessionSync()`. `router.tsx` defines the layout + 8 routes.

**Screens** (`src/screens/`):

| Screen | Route purpose |
|--------|---------------|
| `list.tsx` | Catalog: pagination, search, category filter, sort |
| `detail.tsx` | Product + variant selection, add to cart |
| `cart.tsx` | Cart line items, qty, remove |
| `checkout.tsx` | Address form, place order |
| `confirm.tsx` | Order confirmation |
| `orders.tsx` | Order history (per session) |
| `track.tsx` | Deterministic shipment timeline |
| `saved.tsx` | Saved items |

**Store** (`src/store/`): `cart-slice`, `order-slice`, `saved-slice`, `sync.ts` (server persistence), `hooks.ts` (typed `useAppDispatch`/`useAppSelector`), `index.ts` (store factory via `combineSlices`). Reads use TanStack Query, not slices.

**API client** (`src/api/`): `client.ts` (`hc<AppType>`, auto-adds `x-session-id`), `session.ts` (localStorage UUID). Query hooks live in `src/data/queries.ts`. Query defaults (`query-client.ts`): `staleTime 30s`, `gcTime 5min`, `retry 2`, no refetch-on-focus.

**Theme** `theme.ts` — OKLCH light/dark tokens, Archivo + Spline Sans Mono fonts. PWA via `vite-plugin-pwa`. Dev server `:4200`, output `dist/apps/web`.

## apps/api

Single `src/main.ts` exports the Hono app + `AppType`. Runs on `:3001` via `bun --watch`.

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | liveness |
| GET | `/products` | list: `page`, `limit`, `search`, `category`, `sort` |
| GET | `/categories` | distinct categories |
| GET | `/products/:id` | product + variants |
| GET | `/session` | read cart + saved blobs (upsert-on-read) |
| PUT | `/session` | write cart and/or saved |
| GET | `/orders` | session order history |
| POST | `/orders` | create order (stock-checked transaction) |
| GET | `/orders/:id` | order + tracking timeline |
| POST | `/images` | multipart upload to S3 |

**Seed** (`prisma/seed.ts`): pulls real products from 3 public APIs, dedupes by title, pads to ~2000 via cloning + jittered variants, falls back to synthetic data. Generates variants (apparel S/M/L × Black/White, shoes 4 sizes, else 1 default).

**Nx targets** (`apps/api/project.json`): `serve`, `db:push`, `db:seed`, `db:studio`.

## Data model

Variant-based: the **variant** is the purchasable unit; cart keys are `variantId`.

```
Product         id, title, description, category, image, rating, createdAt,
                priceMin, priceMax, totalStock   ← denormalized
                  └─ variants: ProductVariant[]
ProductVariant  id, productId, options(JSON e.g.{size,color}), optionsLabel,
                price, stock, image
Session         id(client UUID), cart(JSON), saved(JSON), timestamps, orders
Order           id(cuid), total, address fields(nullable), sessionId(nullable)
OrderItem       id, orderId, variantId, quantity, price ← captured at purchase
```

`priceMin/priceMax/totalStock` are denormalized onto `Product` for efficient catalog sort/filter without aggregation; kept in sync inside the order transaction.

## Key decisions

- **No Redux Saga** (despite the brief) — TanStack Query for reads, RTK thunks for writes.
- **Typed RPC** — `hc<AppType>` gives end-to-end types with zero codegen.
- **Sessions as JSON blobs** — cart + saved stored opaquely on `Session`, last-write-wins.
- **Deterministic tracking** — timeline computed from order date + city, no real carrier API.
- **Capacitor web wrapper** instead of React Native, to use MUI; same component model.

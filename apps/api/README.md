# @bytes/api

Hono + Prisma backend for the Bytes marketplace. Runs on Bun, SQLite for zero-setup.

## Setup

```bash
cd apps/api
bunx prisma db push   # create dev.db + generate client
bunx prisma db seed   # 2500 mock products
```

## Run

```bash
nx serve api          # bun --watch, http://localhost:3001
# or: bun --watch src/main.ts
```

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | liveness |
| GET | `/products` | `?page&limit&search&category&sort` — sort: `price-asc\|price-desc\|rating-desc\|newest` |
| GET | `/products/:id` | 404 if missing |
| GET | `/categories` | distinct category names |
| POST | `/orders` | `{ items: [{ productId, quantity }] }` — price & stock authoritative server-side; 409 on insufficient stock |
| POST | `/images` | multipart `file` (image ≤5MB) → `{ key, url }`; persist `key` on a product/variant |

Prices and stock are computed server-side from the DB; the client cannot set them.

## Images

The `image` field stores either a **bucket storage key** (for images in our RustFS
bucket) or an **absolute URL** (external). Responses are resolved on the way out by
`imageUrl()`: a value starting with `http` passes through unchanged, otherwise it's
prefixed with `${S3_PUBLIC_URL}/${S3_BUCKET}`. Persisting keys (not URLs) keeps stored
data independent of the serving domain — see the `product-image-urls` OpenSpec change.

## Typed client (Hono RPC)

The UI gets a fully-typed client with no codegen — types flow from the route
definitions via `AppType`:

```ts
import { api } from '../api/client'; // apps/web/src/api/client.ts

const res = await api.products.$get({ query: { page: '1', sort: 'price-asc' } });
const { items, total, hasMore } = await res.json(); // all typed

await api.orders.$post({ json: { items: [{ productId: 5, quantity: 2 }] } });
```

Override the base URL with `VITE_API_URL` (defaults to `http://localhost:3001`).
Keep route handlers **chained** off `new Hono()` in `main.ts` — that's what
accumulates the type into `AppType`.

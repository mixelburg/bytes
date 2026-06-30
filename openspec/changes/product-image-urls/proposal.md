## Why

Product images now come from two places: existing catalog data holds **absolute external URLs** (Platzi API, `picsum.photos`), while new uploads via `POST /images` live in our own RustFS bucket. Today `product.image` / `variant.image` store a raw string with no rule for which kind it is, so the moment we hardcode a bucket URL into a row, the data is pinned to one domain/bucket forever — a migration headache the instant `s3.bstore.kroha.dev` or the bucket name changes.

## What Changes

- Define a single rule for the `image` field: **store a relative storage key for images we own; store the absolute URL as-is for anything external.**
- The API **resolves** the stored value to a full URL at serialization time — absolute URLs (`http…`) pass through unchanged; bare keys are prefixed with the env-configured public base (`S3_PUBLIC_URL` + bucket).
- `POST /images` returns the **storage key** (to persist) alongside the resolved URL (for immediate display), instead of only a baked-in URL.
- No DB schema change: `image` stays `String`; only its *meaning* and the read-path resolution are specified.

## Capabilities

### New Capabilities
- `product-images`: how product/variant image references are stored, uploaded, and resolved to public URLs (key-vs-URL rule, env-driven base, passthrough of external URLs).

### Modified Capabilities
<!-- none: product-variants requirements unchanged; this adds a new capability rather than altering existing spec behavior. -->

## Impact

- **API** (`apps/api/src/main.ts`): add an `imageUrl()` resolver applied to `/products`, `/products/:id`, and variant images in responses; change `POST /images` return shape to include `key`.
- **Config** (`apps/api/.env`): `S3_PUBLIC_URL` + `S3_BUCKET` already present; resolution depends on them.
- **Seed** (`apps/api/prisma/seed.ts`): unchanged — external URLs keep working via passthrough.
- **Web** (`apps/web`): consumes resolved absolute URLs from the API; no per-component URL building. A future upload UI persists the returned `key`.
- No breaking change to stored data; no migration required.

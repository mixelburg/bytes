## 1. API resolver

- [x] 1.1 Add a shared `imageUrl(value: string): string` helper in `apps/api/src/main.ts` — returns `value` when it starts with `http`, else `` `${S3_PUBLIC_URL}/${BUCKET}/${value}` ``
- [x] 1.2 Apply it to `GET /products` (each item's `image`)
- [x] 1.3 Apply it to `GET /products/:id` (product `image` and every `variant.image`)
- [x] 1.4 Confirm `S3_PUBLIC_URL` and `S3_BUCKET` are read via `requireEnv` so missing config fails at startup

## 2. Upload contract

- [x] 2.1 Confirm `POST /images` returns `{ key, url }` (key persistable, url = resolved key); adjust if it only returns `url`

## 2b. Migrate existing external images

- [x] 2b.1 `apps/api/scripts/migrate-images.ts` — dedupe by URL, download → upload to bucket → `updateMany` URL→key (idempotent, keeps originals on failure)
- [x] 2b.2 Run it: 123 unique URLs, 91 uploaded, 8308 rows migrated; 2559 rows remain on dead hosts (placeimg.com etc.)
- [x] 2b.3 Unfetchable rows: re-seeded with picsum URLs (`scripts/reseed-dead-images.ts`) then migrated — 2559 uploaded, 0 failed. **Result: 0 external URLs left; all 10867 rows on bucket keys (2650 unique objects).**

## 3. Tests

- [x] 3.1 Unit test `imageUrl`: a bare key resolves to `${base}/${bucket}/${key}`, an `http…` value passes through unchanged (`src/images.spec.ts`)
- [x] 3.2 Route test: `GET /products` and `GET /products/:id` return absolute image URLs for products and variants (`src/images.spec.ts`). Note: passthrough of external URLs is covered by the 3.1 unit test, since no external rows remain after migration; also added a `bun`-module stub + test S3 env so api tests run under Node/vitest.

## 4. Docs

- [x] 4.1 Documented the key-vs-URL rule + `POST /images` in `apps/api/README.md`

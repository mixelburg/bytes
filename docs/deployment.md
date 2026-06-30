# Deployment

Two containers behind a Dokploy reverse proxy: an nginx-served static web bundle and a Bun/Hono API with a persistent SQLite volume. Product images live in S3 (RustFS).

## Artifacts (`deploy/`)

| File | Role |
|------|------|
| `Dockerfile.web` | build web with Bun + Vite → nginx:alpine |
| `Dockerfile.api` | Bun + `prisma generate`, runs entrypoint |
| `api-entrypoint.sh` | sets prod `DATABASE_URL`, first-run db push+seed, starts server |
| `web-nginx.conf` | SPA fallback to `index.html` |
| `compose.yml` | orchestrates both on the `dokploy-network` |

## Web image

1. Bun installs deps.
2. Build arg `VITE_API_URL` (default `https://bstore-api.kroha.dev`) — **inlined at build time**, not a runtime var. To change the API URL, rebuild: `docker build --build-arg VITE_API_URL=<url>`.
3. `bunx vite build` → `dist/apps/web`, copied into nginx, served on port 80 with SPA fallback.

## API image

1. Bun installs deps, `bunx prisma generate`.
2. `PORT=3001`, exposes 3001.
3. `api-entrypoint.sh`: overrides `DATABASE_URL=file:/data/prod.db` (mounted volume), runs `prisma db push` + `prisma db seed` on first boot, then `bun src/main.ts`.

## Compose

- Images `bytes-web:latest` / `bytes-api:latest` built locally (never pulled).
- API volume `bytes_data:/data` persists SQLite across redeploys.
- Both attach to external `dokploy-network`; only the reverse proxy is host-exposed.

## Environment variables

**Web (build-time):** `VITE_API_URL`.

**API (runtime):**

| Var | Purpose |
|-----|---------|
| `PORT` | server port (3001) |
| `DATABASE_URL` | SQLite path (set by entrypoint to `/data/prod.db`) |
| `S3_ENDPOINT` | RustFS endpoint |
| `S3_BUCKET` | `bytes-products` |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | RustFS credentials |
| `S3_PUBLIC_URL` | public base for image URLs (`https://s3.kroha.dev`) |

> Credentials are currently hardcoded in `apps/api/.env` and `compose.yml` — move to Dokploy secrets before any real production use.

## Image storage (RustFS / S3)

- `POST /images` (`main.ts:317`): multipart field `file`, validates `image/*`, max 5MB, UUID filename, uploads via Bun's S3 client, returns `{ key, url }`.
- `imageUrl()` helper (`main.ts:24`): pass-through for full HTTP URLs, else resolves to `${S3_PUBLIC_URL}/${BUCKET}/${value}`. Applied to all product/variant images in responses.

## Mobile (Capacitor / Android)

`capacitor.config.ts`: `appId com.bytes.marketplace`, `appName Bytes`, `webDir dist/apps/web`.

```bash
bun run cap:android    # nx build web → cap sync android → open Android Studio
cap add ios            # scaffold iOS (Mac + CocoaPods; not yet committed)
```

The Android shell points at the built `dist/apps/web`, so it ships with whatever `VITE_API_URL` was baked into that build.

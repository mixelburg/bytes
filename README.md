# Bytes Marketplace

**Live demo:** [bstore.kroha.dev](https://bstore.kroha.dev) · API: [bstore-api.kroha.dev](https://bstore-api.kroha.dev)

Mobile-friendly marketplace web app (React + Vite + MUI), packaged to native via **Capacitor**. Nx monorepo, **Bun** package manager. The UI reads/writes a typed **Hono + Prisma** backend over an `hc<AppType>` RPC client. Variant-based catalog built to scale to thousands of products (paginated list, search, category filter, sort).

## Stack

| Layer | Tech |
|-------|------|
| Web | React 19, Vite 8, React Router 7, MUI v9 (styled-components engine) |
| Client state | Redux Toolkit (cart, saved, checkout) |
| Server reads | TanStack Query |
| API | Hono 4, typed `hc<AppType>` RPC client |
| DB | Prisma 7 + SQLite (LibSQL adapter) |
| Images | S3 (RustFS) |
| Mobile | Capacitor (Android scaffolded) |
| Tooling | Nx 23, Bun, Biome, Vitest, Playwright |

## Quick start

```bash
bun install
nx run api:db:push     # sync Prisma schema + generate client
nx run api:db:seed     # populate ~2000 products

# two terminals:
nx serve api           # Hono on :3001
nx dev web             # Vite on :4200
```

Web reads `VITE_API_URL` (default `http://localhost:3001`). The UI degrades to its error state if the API is down.

## Common commands

```bash
nx test web            # Vitest unit/component tests
nx e2e web             # Playwright (Chromium + Mobile Chrome)
bun run lint           # biome check .
bun run build          # build all
bun run cap:android    # build web, sync, open Android Studio
```

## Docs

- [Architecture](docs/architecture.md) — monorepo layout, apps, data model, key decisions
- [Flows](docs/flows.md) — catalog, cart/checkout/order, sessions, saved, order tracking
- [Deployment](docs/deployment.md) — Docker, Dokploy compose, env vars, image storage, mobile

See also: [`CLAUDE.md`](CLAUDE.md) (project conventions), [`.impeccable.md`](.impeccable.md) (design system), [`openspec/`](openspec/) (change proposals).

<div align="center">

# 🛍️ Bytes Marketplace

**A mobile-friendly marketplace built to scale to thousands of products.**

[**Live demo →**](https://bstore.kroha.dev)  ·  [API](https://bstore-api.kroha.dev)  ·  [Architecture](docs/architecture.md)  ·  [Deployment](docs/deployment.md)

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-1-000?logo=bun&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-4-E36002?logo=hono&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF?logo=capacitor&logoColor=white)

</div>

React + Vite + MUI on the front, a typed **Hono + Prisma** backend on the back, talking over an `hc<AppType>` RPC client — no codegen, types flow end to end. Nx monorepo, **Bun** package manager, packaged to native via **Capacitor**.

## Features

- 🔎 **Catalog at scale** — paginated list, full-text search, category filter, and sort over a variant-based catalog of ~2000 products.
- 🛒 **Cart → checkout → order tracking** — price and stock are authoritative server-side; orders get a delivery timeline.
- 👤 **Anonymous sessions** — cart, saved items, and orders persist per device with no login.
- 🔌 **End-to-end types** — the UI's API client is generated from the backend's route definitions; a route change is a compile error in the UI.
- 🌗 **Light + dark themes** from shared OKLCH tokens, with loading / empty / error / success states on every async flow.
- 📱 **Native-ready** — the same web build wraps to Android via Capacitor.

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

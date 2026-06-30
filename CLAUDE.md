# Bytes Marketplace

Mobile-friendly marketplace web app (React + Vite), packaged to native via **Capacitor**. Nx monorepo, **Bun** package manager. Stack: TypeScript (**no `any`**), **MUI v9** with the **styled-components** engine (`@mui/styled-engine-sc`, swapped in via a package `override`), **Redux Toolkit** (client state: cart, checkout), **TanStack Query** (server reads). The UI reads/writes a real **Hono + Prisma** backend (`apps/api`) via a typed `hc<AppType>` client; the catalog is variant-based. Must scale to thousands of products (paginated list, search, category filter, sort). Frontend lives in `apps/web`. See `task.md` for the full brief.

> Note 1: the brief names React Native; we deliver an equivalent mobile experience as a Capacitor-wrapped web app so MUI can be used. Same component model (styled-components, RTK, TS discipline).
>
> Note 2: **We are NOT using Redux Saga** despite the brief. Async data flows use **TanStack Query** (reads) and RTK thunks where needed (writes). Saga adds orchestration machinery we don't need here.

## Workflow

**Spec first (OpenSpec).** Before implementing any non-trivial feature, propose a change with OpenSpec (`/openspec-propose`), implement against it (`/openspec-apply-change`), then archive (`/openspec-archive-change`). Specs live in `openspec/`. Don't write feature code without a corresponding change.

**Commits.** When an OpenSpec proposal is archived, commit the change. Also make in-progress commits as needed while implementing — don't let work pile up into one giant commit.

**Backend (local dev).** Run `nx serve api` (Hono on `:3001`, SQLite via Prisma) alongside `nx dev web`. Setup once: `nx run api:db:push` (generates the Prisma client + syncs schema) then `nx run api:db:seed`. The web client reads `VITE_API_URL` (default `http://localhost:3001`). The UI degrades to its error state if the API is down.

**Mobile (Capacitor).** `apps/web` builds to `dist/apps/web`, wrapped natively by Capacitor (`capacitor.config.ts` at root). Android platform is added (`android/`). Build + run native: `bun cap:android` (needs Android Studio). iOS package is installed but not scaffolded — run `cap add ios` on a Mac with CocoaPods.

**Design via Impeccable.** All UI work goes through the `impeccable` skill. Design context lives in `.impeccable.md` — read it before any visual work. Use `/impeccable craft <screen>` to build screens. Honor its bans (no gradient text, side-stripe cards, glassmorphism, neon-on-dark, everything-in-a-card).

## Non-negotiables

- No `any`. Model data explicitly; lean on RTK + TanStack Query types.
- Every async flow has loading / empty / error / success states — no dead ends.
- Tests for critical logic: unit/component via Vitest (`nx test web`), e2e via Playwright (`nx e2e web`, Chromium + Mobile Chrome). E2e specs live in `apps/web/e2e/`.
- Both light + dark themes via shared OKLCH tokens.

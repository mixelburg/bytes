## Context

`bun outdated --recursive` flags 10 packages behind latest across two workspaces
(`@bytes/source` root, `@bytes/api`). Most are patch/minor. Two are major,
breaking bumps: **TypeScript 5.9→6.0** and **Prisma 6.19→7.8**. The rest are
type/test-only majors (`@types/node` 22→26, `jsdom` 27→29) that rarely break
runtime but can surface stricter types. Bun is the package manager; `bun.lock`
is the lockfile. Verification gates already exist (biome, nx build, vitest,
playwright, prisma db:push/seed).

## Goals / Non-Goals

**Goals:**
- Bring every outdated dependency to its latest version.
- Keep all verification gates green (per `dependency-currency` spec).
- Land the two breaking bumps deliberately, not blindly.

**Non-Goals:**
- No feature work, refactors, or config changes beyond what a bump requires.
- No touching already-current deps (Nx, React, MUI, Hono, RTK, Query, router).
- No migrating off `react-router-dom` to `react-router` (separate concern).

## Decisions

**Stage the bumps by risk, not all at once.** Land low-risk first so a later
failure is easy to attribute.
1. Patch/minor + type/test majors (`@testing-library/*`, `jiti`, `vite`,
   `@types/node`, `jsdom`) — one commit, run gates.
2. TypeScript 6 — separate commit; fix any new type errors in-place.
3. Prisma 7 (`prisma` + `@prisma/client` together, must match) — separate
   commit; regenerate client, re-run `db:push` + `db:seed`.

Rationale: bisecting a single mega-bump commit when e2e goes red is the slow
path. Three commits keep blast radius legible. Alternative (one bump-all commit)
rejected — cheaper to write, costlier to debug.

**Pin styles stay as-is.** Keep each dependency's existing range style (`^`, `~`,
exact) — only change the number. Nx deps are intentionally exact-pinned; they're
not outdated, so untouched.

**Read the migration notes for the two majors before editing code.** Use
Context7 for Prisma 7 and TypeScript 6 release/migration docs rather than
guessing at API changes.

## Risks / Trade-offs

- **Prisma 7 generator/client API changes break `apps/api`** → bump client +
  CLI together, regenerate, run `db:push`/`db:seed`, and exercise the API
  endpoints the web app reads before calling it done.
- **TS 6 stricter defaults surface new type errors (no `any` rule means no
  escape hatch)** → fix types properly; if a fix balloons, isolate it and flag
  rather than suppress.
- **`@types/node` 26 vs Node runtime mismatch** → harmless for build-time types;
  verify nothing in api/build references removed Node typings.
- **Lockfile churn** → regenerate `bun.lock` once at the end; review the diff is
  bumps-only.

## Migration Plan

1. Stage 1 bump + `bun install` + gates → commit.
2. Stage 2 (TS 6) + gates → commit.
3. Stage 3 (Prisma 7) + db:push/seed + gates → commit.
4. Rollback: each stage is its own commit; revert the offending one.

## Why

Several dependencies have drifted behind their latest releases, including two
major-version jumps (Prisma 6→7, TypeScript 5.9→6) that carry breaking changes.
Updating now keeps the toolchain current, picks up fixes, and avoids a larger,
riskier catch-up later.

## What Changes

Bump every outdated dependency to its latest version (per `bun outdated --recursive`):

- **Patch/minor (low risk):** `@testing-library/dom` 10.4.0→10.4.1,
  `@testing-library/react` 16.3.0→16.3.2, `jiti` 2.4.2→2.7.0, `vite` 8.1.1→8.1.2.
- **Major — types/test only:** `@types/node` 22→26, `jsdom` 27→29.
- **BREAKING — `typescript` 5.9→6.0** (@bytes/source). New compiler defaults /
  removed flags may surface type errors.
- **BREAKING — `prisma` + `@prisma/client` 6.19→7.8** (@bytes/api). Prisma 7 has
  generator/client API changes; schema and `db:push`/`db:seed` must be re-verified.

No application features change. Already-current deps (Nx 23, React 19, MUI 9,
Hono 4, RTK 2, TanStack Query 5, react-router 7) are untouched.

## Capabilities

### New Capabilities

- `dependency-currency`: the project's verification gates (build, lint,
  type-check, unit + e2e tests, and local DB sync/seed) SHALL pass on the
  updated dependency set. This is the contract that makes the bump safe; there
  is no user-facing feature change.

### Modified Capabilities

None — no existing spec-level requirements change.

## Impact

- **Dependencies:** root `package.json` (@bytes/source) and `apps/api/package.json`.
- **Code:** possible type-error fixes from TS 6; possible Prisma client/query
  adjustments from Prisma 7.
- **Verification:** `biome check`, `nx run-many -t build`, `nx test web`,
  `nx e2e web`, and `nx run api:db:push` + `api:db:seed`.
- **Lockfile:** `bun.lock` regenerated.

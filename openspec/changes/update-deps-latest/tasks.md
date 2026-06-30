## 1. Stage 1 — low-risk bumps (root `@bytes/source`)

- [x] 1.1 Bump in root `package.json`: `@testing-library/dom`→10.4.1, `@testing-library/react`→16.3.2, `jiti`→2.7.0, `vite`→8.1.2, `@types/node`→26, `jsdom`→29 (keep each existing range style)
- [x] 1.2 `bun install`
- [x] 1.3 Run gates: `nx run-many -t build` ✓, `nx test web` ✓ (20), `nx e2e web` ✓ (16). `biome check .` has 6 pre-existing format errors in unrelated in-flight files (sync.ts, orders.tsx, queries.ts, main.ts, session*.spec.ts) — not caused by this bump.
- [ ] 1.4 Commit ("chore(deps): bump low-risk + type/test deps to latest")

## 2. Stage 2 — TypeScript 6 (BREAKING)

- [x] 2.1 Read TS 6 migration/release notes via Context7 before editing
- [x] 2.2 Bump `typescript`→6.0.x in root `package.json`, `bun install`
- [x] 2.3 Fixed TS6 `esModuleInterop=false` deprecation (removed; `allowSyntheticDefaultImports` already covers it). The flood of `{}` type errors traced to Prisma 6 client types under TS6 — cleared by the Prisma 7 regen, not by source edits. tsc: 0 errors across api/web-app/web-spec.
- [x] 2.4 Re-run gates (build ✓ + `nx test web` ✓)
- [ ] 2.5 Commit ("chore(deps): upgrade TypeScript to 6")  *(deferred — see Stage 3 note; TS6 + Prisma7 land together)*

## 3. Stage 3 — Prisma 7 (BREAKING, `@bytes/api`)

- [x] 3.1 Read Prisma 7 migration/upgrade guide via Context7 before editing
- [x] 3.2 Bump `prisma` + `@prisma/client`→7.8.x together in `apps/api/package.json`, `bun install`
- [x] 3.3 P7 migration: removed `url` from `schema.prisma`; added `prisma.config.ts` (schema/migrations/datasource + `seed`, no auto-`.env` so reads `process.env` with fallback); rewrote `db.ts`/`seed.ts` to use a driver adapter. **Switched better-sqlite3 → `@prisma/adapter-libsql`** because better-sqlite3's native binding fails under Bun (ERR_DLOPEN_FAILED). Removed dead `prisma.seed` field from package.json.
- [x] 3.4 `nx run api:db:push` ✓ then `nx run api:db:seed` ✓ (2000 products / 2953 variants on Prisma 7 + libSQL)
- [x] 3.5 Smoke-tested API on a free port (3001 was occupied): list + detail endpoints return real data, clean startup
- [ ] 3.6 Commit ("chore(deps): upgrade Prisma to 7")  *(deferred — see note below)*

## 4. Finalize

- [x] 4.1 Gates: `nx run-many -t build` ✓, `nx test web` ✓ (20), `nx e2e web` ✓ (16). `biome check .` has 6 pre-existing format errors in unrelated in-flight files — not from this change.
- [x] 4.2 `bun outdated --recursive` → 0 outdated packages
- [ ] 4.3 Review `bun.lock` diff is bumps-only (do at commit time)
- [ ] 4.4 Archive the change (`/opsx:archive`) and commit

> **Commits deferred:** working tree has unrelated `add-anonymous-session-persistence` WIP. Committing the dep bump on `main` would sweep that in. Left for the user to branch/stage as they prefer.

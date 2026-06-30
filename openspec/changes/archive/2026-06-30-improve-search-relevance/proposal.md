## Why

Search matches a single contiguous substring against `title` only (`GET /products` → `title: { contains: search }`). Two problems: multi-word queries like "red shoes" fail unless that exact phrase is in the title, and at the planned scale of **~100k products** a `LIKE '%term%'` full-table scan (×3 fields ×N words if we naively broaden it) becomes a real latency cost — exactly the access pattern a plain B-tree index can't accelerate because of the leading wildcard.

## What Changes

- Add a SQLite **FTS5** full-text index over `title`, `description`, `category` (external-content, so no duplicated row storage), kept in sync with `Product` via triggers.
- The search path queries FTS5 (`MATCH`) instead of `LIKE`: multi-word (AND of terms), prefix matching (`term*`), case- and accent-insensitive, scaling to 100k+ rows in sub-millisecond index lookups.
- Empty-search browsing keeps the existing typed Prisma path (category + sort + pagination already use indexes) — FTS is only on the search branch.
- FTS setup runs **idempotently at API startup** (`CREATE ... IF NOT EXISTS` + one-time backfill), because `prisma db push` cannot create virtual tables/triggers and the production volume already holds a populated db.
- No new npm dependency (FTS5 ships in libSQL), no DB engine switch (SQLite handles 100k fine), no frontend change.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `catalog-browsing`: the "Search and category filtering via the API" requirement changes what a search term matches (multi-word, across title/description/category) and how it scales.

## Impact

- `apps/api/src/main.ts` — `GET /products` search branch: raw FTS5 query joined to `Product` for the search case; existing Prisma query retained for the no-search case; count adjusted to match.
- `apps/api/src/db.ts` (or a small `fts.ts` called on boot) — idempotent FTS5 table + trigger creation + backfill.
- New SQLite objects: `product_fts` virtual table + AFTER INSERT/UPDATE OF/DELETE triggers on `Product`. Not represented in `schema.prisma` (Prisma can't model them).
- No migration files (`db push` workflow), no schema model changes, no new dependency.

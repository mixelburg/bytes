## Context

- DB: a single SQLite file via the libSQL adapter (`apps/api/src/db.ts`). Prod is `/data/prod.db` on a mounted volume (`deploy/api-entrypoint.sh`), synced with `prisma db push` (no migration files). Seed/init only runs on first boot when the db file is absent.
- Current search: `where = { title: { contains: search } }` in `GET /products` (`apps/api/src/main.ts`). Leading-wildcard `LIKE`, single field, single contiguous term.
- Target scale: ~100k `Product` rows. That is comfortable for SQLite generally, but a `LIKE '%term%'` scan is O(rows) and a B-tree index can't help (leading wildcard). FTS5 is the native fix.

## Goals / Non-Goals

**Goals:**
- Multi-word, multi-field search (title/description/category) that stays fast at 100k+ rows.
- No new npm dependency, no DB engine switch, no frontend change, no Prisma migration files.
- Survive the existing deploy: prod already has a populated db, so FTS must be created and backfilled idempotently on an existing database.

**Non-Goals:**
- Switching to Postgres. SQLite handles 100k rows; the schema's "swap to postgres" note is about concurrency, not this.
- Relevance-ranked default ordering, fuzzy/typo tolerance, synonyms. (bm25 ranking and a `relevance` sort key are noted as cheap follow-ups, not built here.)
- Full mid-token infix matching (LIKE `%hoes%` → `shoes`). Token/prefix matching is better product-search behavior; trigram tokenizer is the upgrade path if true infix is ever required.

## Decisions

**1. FTS5 external-content virtual table.**
`CREATE VIRTUAL TABLE product_fts USING fts5(title, description, category, content='Product', content_rowid='id')`. External-content stores only the inverted index (not copies of the columns), keyed to `Product.id`. Tokenizer: default `unicode61` (case- and accent-insensitive, unicode-aware).
- *Alternative — contentless/standalone FTS:* duplicates the text; rejected, wastes space and risks drift.
- *Alternative — Postgres `tsvector` / `pg_trgm`:* requires migrating the whole datastore; out of scope.

**2. Keep it in sync with triggers (the external-content pattern).**
- `AFTER INSERT ON Product` → `INSERT INTO product_fts(rowid, title, description, category) VALUES (new.id, ...)`.
- `AFTER DELETE ON Product` → the FTS5 `'delete'` command row.
- `AFTER UPDATE OF title, description, category ON Product` → delete-then-insert. `UPDATE OF` so stock/price updates (the order transaction writes `Product.totalStock`) do **not** re-index unnecessarily.

**3. Idempotent init at API startup, not first-boot entrypoint.**
A small `ensureFts(db)` runs on every boot: `CREATE VIRTUAL TABLE IF NOT EXISTS`, `CREATE TRIGGER IF NOT EXISTS` ×3, then a backfill guarded by emptiness (`INSERT INTO product_fts(rowid,...) SELECT id,... FROM Product` only when `SELECT count(*) FROM product_fts` is 0). This is required because the prod volume already has a populated db that `db push` won't touch — first-boot-only setup would never reach it. Idempotent + cheap on subsequent boots (a couple of catalog queries).

**4. Branch the query; raw SQL only on the search path.**
- `search === ''` → unchanged typed Prisma query (category/sort/pagination on existing indexes).
- `search !== ''` → `$queryRawUnsafe` / `$queryRaw`:
  `SELECT p.* FROM product_fts f JOIN Product p ON p.id = f.rowid WHERE product_fts MATCH ? [AND p.category = ?] ORDER BY <sort> LIMIT ? OFFSET ?` plus a matching `count(*)`. Honor the existing `SortKey` map (no relevance sort yet). Response shape (`items/total/page/limit/hasMore`) unchanged.

**5. Build the MATCH string safely.**
User input is tokenized in app code: split on whitespace, strip FTS5 syntax characters (`"`, `*`, `(`, `)`, `:`, `-`, `^`), drop empties, append `*` to each token for prefix matching, and AND them by joining with spaces (FTS5 default is AND). Bind as a single parameter. Empty-after-sanitize → fall back to the no-search path. This prevents FTS5 syntax errors and injection via the query.

## Risks / Trade-offs

- [libSQL build lacks FTS5] → Verified by a runnable check: `CREATE VIRTUAL TABLE ... USING fts5` in init; libSQL ships FTS5 by default, but the init will surface any gap immediately on boot. If absent, fall back is the multi-field `LIKE` AND-of-ORs (acceptable to ~low tens of thousands).
- [Triggers + raw SQL live outside `schema.prisma`] → documented here and created by `ensureFts`; anyone re-running `db push` keeps working because init re-creates `IF NOT EXISTS`.
- [Prefix not infix matching] → better relevance for product search; trigram tokenizer is the documented upgrade if mid-token matching is required.
- [Backfill cost at 100k on a fresh db] → one bulk `INSERT ... SELECT`, runs once; trivial compared to seeding 100k rows in the first place.
- [Sort by non-relevance keys on a large match set] → ordering uses `Product`'s existing `priceMin`/`createdAt` columns (indexed); FTS narrows first, so the sort set is the matched subset.

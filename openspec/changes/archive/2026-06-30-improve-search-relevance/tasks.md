## 1. FTS index + sync

- [x] 1.1 Add `ensureFts(db)` (in `apps/api/src/db.ts` or a new `apps/api/src/fts.ts`): `CREATE VIRTUAL TABLE IF NOT EXISTS product_fts USING fts5(title, description, category, content='Product', content_rowid='id')`.
- [x] 1.2 Create `IF NOT EXISTS` triggers: `AFTER INSERT ON Product`, `AFTER DELETE ON Product` (FTS5 `'delete'` row), `AFTER UPDATE OF title, description, category ON Product` (delete-then-insert).
- [x] 1.3 Backfill guarded by emptiness: if `count(*) FROM product_fts` is 0, `INSERT INTO product_fts(rowid, title, description, category) SELECT id, title, description, category FROM Product`.
- [x] 1.4 Call `ensureFts` once on API startup (before the server starts serving) so it runs idempotently on every boot, including the existing populated prod volume.

## 2. Search query

- [x] 2.1 Add a tokenizer/sanitizer: split `search` on whitespace, strip FTS5 syntax chars, drop empties, append `*` per token, join with spaces; empty result → treat as no search.
- [x] 2.2 In `GET /products`: when search is empty keep the current Prisma query; when non-empty run the raw FTS join (`product_fts MATCH ?` + optional `category` filter + existing sort + `LIMIT/OFFSET`) and a matching `count(*)`. Keep the `items/total/page/limit/hasMore` response shape and the `image`/`inStock` mapping.

## 3. Verify

- [x] 3.1 FTS availability check: confirm `ensureFts` runs without error on a fresh db (proves libSQL has FTS5).
- [x] 3.2 API test: multi-word query (`red shoes`) returns a product whose words are split across title and category/description; prefix query (`sho`) matches `shoes`; search + category + sort combine correctly; empty search returns the full paginated list.
- [x] 3.3 Sync test: insert/update(title)/delete a `Product` and confirm `product_fts` reflects it; updating only `totalStock` does NOT change FTS results.
- [x] 3.4 Scale sanity: seed near the target volume (raise seed `TARGET`) and confirm a search returns in well under the LIKE-scan baseline.

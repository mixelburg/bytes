import type { PrismaClient } from '@prisma/client';

// FTS5 full-text index over Product, for search that scales to ~100k rows
// (a leading-wildcard LIKE can't use an index; FTS5 can). This lives outside
// schema.prisma because Prisma can't model virtual tables or triggers, and it
// runs on every boot because `prisma db push` won't create it and the prod
// volume already holds a populated db. Everything here is idempotent.
//
// External-content table (`content='Product'`): only the inverted index is
// stored, keyed to Product.id — no duplicated row text. Triggers keep it in
// sync; `AFTER UPDATE OF title,description,category` so stock/price writes
// (the order transaction touches Product.totalStock) don't re-index.
const STATEMENTS = [
  `CREATE VIRTUAL TABLE IF NOT EXISTS product_fts USING fts5(
     title, description, category,
     content='Product', content_rowid='id'
   )`,
  `CREATE TRIGGER IF NOT EXISTS product_fts_ai AFTER INSERT ON Product BEGIN
     INSERT INTO product_fts(rowid, title, description, category)
     VALUES (new.id, new.title, new.description, new.category);
   END`,
  `CREATE TRIGGER IF NOT EXISTS product_fts_ad AFTER DELETE ON Product BEGIN
     INSERT INTO product_fts(product_fts, rowid, title, description, category)
     VALUES ('delete', old.id, old.title, old.description, old.category);
   END`,
  `CREATE TRIGGER IF NOT EXISTS product_fts_au
     AFTER UPDATE OF title, description, category ON Product BEGIN
       INSERT INTO product_fts(product_fts, rowid, title, description, category)
       VALUES ('delete', old.id, old.title, old.description, old.category);
       INSERT INTO product_fts(rowid, title, description, category)
       VALUES (new.id, new.title, new.description, new.category);
   END`,
];

export async function ensureFts(db: PrismaClient): Promise<void> {
  for (const sql of STATEMENTS) await db.$executeRawUnsafe(sql);
  // Backfill from the content table when empty (fresh index over an existing
  // catalog). 'rebuild' is FTS5's canonical external-content repopulate.
  const [{ n }] = await db.$queryRawUnsafe<[{ n: number | bigint }]>(
    'SELECT count(*) AS n FROM product_fts',
  );
  if (Number(n) === 0) {
    await db.$executeRawUnsafe(
      `INSERT INTO product_fts(product_fts) VALUES('rebuild')`,
    );
  }
}

// Turn raw user input into a safe FTS5 MATCH string: split on anything that
// isn't a letter/number (mirrors the tokenizer, handles "t-shirt"), drop
// empties, prefix-match each token, AND them (FTS5 default). Returns '' when
// nothing usable is left so callers can fall back to the non-search path.
export const ftsMatch = (raw: string): string =>
  raw
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((w) => `${w}*`)
    .join(' ');

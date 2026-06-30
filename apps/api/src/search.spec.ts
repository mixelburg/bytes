import { describe, expect, it } from 'vitest';
import { db } from './db';
import server from './main';

// `server from './main'` runs ensureFts() at import — so reaching these tests at
// all proves libSQL has FTS5 and the index/triggers built against the dev DB.
const json = async (path: string) =>
  (await server.fetch(new Request(`http://test${path}`))).json();

const TOKEN = 'zqxwplum'; // improbable in seed data → deterministic matches
const has = (res: { items: Array<{ id: number }> }, id: number) =>
  res.items.some((i) => i.id === id);

const makeProduct = (
  over: Partial<{ title: string; description: string; category: string }> = {},
) =>
  db.product.create({
    data: {
      title: `${TOKEN} widget`,
      description: 'a test description',
      category: 'TestCat',
      image: 'http://img/x.png',
      priceMin: 5,
      priceMax: 5,
      totalStock: 3,
      ...over,
    },
  });

describe('GET /products search (FTS5)', () => {
  it('finds a product by a word in its title', async () => {
    const p = await makeProduct();
    try {
      expect(has(await json(`/products?search=${TOKEN}`), p.id)).toBe(true);
    } finally {
      await db.product.delete({ where: { id: p.id } });
    }
  });

  it('prefix-matches a partial word', async () => {
    const p = await makeProduct();
    try {
      expect(has(await json(`/products?search=${TOKEN.slice(0, 4)}`), p.id)).toBe(
        true,
      );
    } finally {
      await db.product.delete({ where: { id: p.id } });
    }
  });

  it('matches a multi-word query split across title and category', async () => {
    const p = await makeProduct({ title: `${TOKEN} thing`, category: 'Gizmospace' });
    try {
      // "zqxwplum gizmo" → AND of zqxwplum* (title) and gizmo* (category)
      expect(has(await json(`/products?search=${TOKEN}%20gizmo`), p.id)).toBe(true);
    } finally {
      await db.product.delete({ where: { id: p.id } });
    }
  });

  it('matches a term found only in the description', async () => {
    const p = await makeProduct({
      title: 'plain title',
      description: `contains ${TOKEN} inside`,
    });
    try {
      expect(has(await json(`/products?search=${TOKEN}`), p.id)).toBe(true);
    } finally {
      await db.product.delete({ where: { id: p.id } });
    }
  });

  it('combines search with the category filter', async () => {
    const p = await makeProduct({ category: 'UniqCat' });
    try {
      expect(has(await json(`/products?search=${TOKEN}&category=UniqCat`), p.id)).toBe(
        true,
      );
      expect(has(await json(`/products?search=${TOKEN}&category=NopeCat`), p.id)).toBe(
        false,
      );
    } finally {
      await db.product.delete({ where: { id: p.id } });
    }
  });

  it('falls back to the full catalog for an empty/punctuation search', async () => {
    const all = await json('/products?limit=1');
    expect(all.total).toBeGreaterThan(0);
    const punct = await json('/products?search=%20%2C%2C'); // "  ,,"
    expect(punct.total).toBe(all.total);
  });

  it('keeps the index in sync on insert/update/delete', async () => {
    const p = await makeProduct({ title: `${TOKEN} sync` });
    try {
      expect(has(await json(`/products?search=${TOKEN}`), p.id)).toBe(true);

      // stock-only write must NOT re-index (trigger is UPDATE OF title/desc/cat)
      await db.product.update({ where: { id: p.id }, data: { totalStock: 99 } });
      expect(has(await json(`/products?search=${TOKEN}`), p.id)).toBe(true);

      // renaming the title drops the old token from the index
      await db.product.update({ where: { id: p.id }, data: { title: 'renamed' } });
      expect(has(await json(`/products?search=${TOKEN}`), p.id)).toBe(false);
    } finally {
      await db.product.delete({ where: { id: p.id } });
    }
    // delete cleaned up the row
    expect(has(await json('/products?search=renamed'), p.id)).toBe(false);
  });
});

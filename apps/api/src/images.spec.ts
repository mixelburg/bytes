import { describe, it, expect } from 'vitest';
import server, { imageUrl } from './main';

// Env mirrors vitest.config.ts.
const BASE = 'https://cdn.test/test-bucket';
const req = (path: string) => server.fetch(new Request(`http://test${path}`));

describe('imageUrl resolver', () => {
  it('prefixes a bare storage key with the public base + bucket', () => {
    expect(imageUrl('abc123.png')).toBe(`${BASE}/abc123.png`);
  });

  it('passes an absolute external URL through unchanged', () => {
    const url = 'https://picsum.photos/seed/bytes-1/400/400';
    expect(imageUrl(url)).toBe(url);
  });
});

describe('image resolution across product endpoints', () => {
  it('GET /products returns absolute image URLs', async () => {
    const list = await (await req('/products?limit=5')).json();
    expect(list.items.length).toBeGreaterThan(0);
    for (const item of list.items as Array<{ image: string }>) {
      expect(item.image).toMatch(/^https?:\/\//);
    }
  });

  it('GET /products/:id resolves product and variant images', async () => {
    const list = await (await req('/products?limit=1')).json();
    const detail = await (await req(`/products/${list.items[0].id}`)).json();
    expect(detail.image).toMatch(/^https?:\/\//);
    for (const v of detail.variants as Array<{ image: string }>) {
      expect(v.image).toMatch(/^https?:\/\//);
    }
  });
});

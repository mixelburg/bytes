import { describe, it, expect } from 'vitest';
import server from './main';

// Hono apps are testable without a port: app.fetch(Request) → Response.
// ponytail: runs against the seeded dev DB and decrements real stock (1/run); reseed if it ever drains.
const req = (path: string, init?: RequestInit) => server.fetch(new Request(`http://test${path}`, init));
const post = (body: unknown) =>
  req('/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

type Variant = { id: number; price: number; stock: number };

async function aStockedVariant(): Promise<{ productId: number; variant: Variant }> {
  const list = await (await req('/products?limit=20&sort=rating-desc')).json();
  for (const item of list.items as Array<{ id: number }>) {
    const detail = await (await req(`/products/${item.id}`)).json();
    const variant = (detail.variants as Variant[]).find((v) => v.stock >= 2);
    if (variant) return { productId: item.id, variant };
  }
  throw new Error('no stocked variant found — reseed the DB');
}

describe('POST /orders (variant-level)', () => {
  it('places an order against a variant and decrements its stock', async () => {
    const { productId, variant } = await aStockedVariant();

    const res = await post({ items: [{ variantId: variant.id, quantity: 2 }] });
    expect(res.status).toBe(201);

    const order = await res.json();
    expect(order.items).toHaveLength(1);
    expect(order.items[0].variantId).toBe(variant.id);
    expect(order.items[0].price).toBe(variant.price); // unit price snapshotted server-side
    expect(order.total).toBeCloseTo(variant.price * 2, 5);

    const after = await (await req(`/products/${productId}`)).json();
    const updated = (after.variants as Variant[]).find((v) => v.id === variant.id)!;
    expect(updated.stock).toBe(variant.stock - 2);
  });

  it('rejects insufficient variant stock with 409', async () => {
    const { variant } = await aStockedVariant();
    const res = await post({ items: [{ variantId: variant.id, quantity: variant.stock + 1_000_000 }] });
    expect(res.status).toBe(409);
  });

  it('rejects an unknown variant with 400', async () => {
    const res = await post({ items: [{ variantId: 999_999_999, quantity: 1 }] });
    expect(res.status).toBe(400);
  });

  it('rejects an empty order with 400', async () => {
    const res = await post({ items: [] });
    expect(res.status).toBe(400);
  });

  it('persists the delivery address and exposes it via GET /orders/:id', async () => {
    const { variant } = await aStockedVariant();
    const address = { recipient: 'Alex Rivera', line1: '128 Linden St', city: 'Berlin', postal: '10115', country: 'DE' };
    const placed = await post({ items: [{ variantId: variant.id, quantity: 1 }], address });
    const { id } = await placed.json();

    const res = await req(`/orders/${id}`);
    expect(res.status).toBe(200);
    const order = await res.json();
    expect(order.address).toMatchObject(address);
    expect(order.stops.length).toBeGreaterThan(0);
    expect(order.stops.some((s: { label: string }) => s.label.includes('Berlin'))).toBe(true);
    expect(order.eta).toBeTruthy();
  });

  it('returns 404 for an unknown order id', async () => {
    const res = await req('/orders/does-not-exist');
    expect(res.status).toBe(404);
  });
});

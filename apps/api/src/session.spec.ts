import { describe, expect, it } from 'vitest';
import server from './main';

// Hono apps are testable without a port: app.fetch(Request) → Response.
// Each test uses a unique x-session-id so runs stay isolated on the shared dev DB.
const req = (path: string, sid?: string, init?: RequestInit) =>
  server.fetch(
    new Request(`http://test${path}`, {
      ...init,
      headers: { ...init?.headers, ...(sid ? { 'x-session-id': sid } : {}) },
    }),
  );

const json = (path: string, sid: string, method: string, body: unknown) =>
  req(path, sid, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

async function aStockedVariant(): Promise<{ id: number }> {
  const list = await (await req('/products?limit=20&sort=rating-desc')).json();
  for (const item of list.items as Array<{ id: number }>) {
    const detail = await (await req(`/products/${item.id}`)).json();
    const variant = (detail.variants as Array<{ id: number; stock: number }>).find(
      (v) => v.stock >= 1,
    );
    if (variant) return { id: variant.id };
  }
  throw new Error('no stocked variant found — reseed the DB');
}

const newSid = (n: string) => `test-session-${n}-${Date.now()}`;

describe('anonymous session', () => {
  it('GET /session upserts and returns an empty session for a new id', async () => {
    const res = await req('/session', newSid('empty'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cart: [], saved: [] });
  });

  it('GET /session returns a neutral empty result with no header', async () => {
    const res = await req('/session');
    expect(await res.json()).toEqual({ cart: [], saved: [] });
  });

  it('PUT /session round-trips cart and saved blobs', async () => {
    const sid = newSid('rt');
    const cart = [{ variantId: 1, qty: 2, title: 'X', price: 9 }];
    const saved = [3, 9];
    await json('/session', sid, 'PUT', { cart, saved });

    const res = await req('/session', sid);
    const body = await res.json();
    expect(body.cart).toEqual(cart);
    expect(body.saved).toEqual(saved);
  });

  it('GET /orders is scoped by session header', async () => {
    const sid = newSid('orders');
    const { id } = await aStockedVariant();
    const placed = await json('/orders', sid, 'POST', {
      items: [{ variantId: id, quantity: 1 }],
    });
    expect(placed.status).toBe(201);
    const order = await placed.json();

    // This session sees its order...
    const mine = await (await req('/orders', sid)).json();
    expect(mine.some((o: { id: string }) => o.id === order.id)).toBe(true);

    // ...a different session does not.
    const other = await (await req('/orders', newSid('other'))).json();
    expect(other.some((o: { id: string }) => o.id === order.id)).toBe(false);
  });

  it('GET /orders is empty with no header', async () => {
    expect(await (await req('/orders')).json()).toEqual([]);
  });
});

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Configurable mock of the orders endpoint.
const h = vi.hoisted(() => ({
  resp: null as unknown,
  shouldThrow: false,
}));

vi.mock('../api/client', () => ({
  api: {
    orders: {
      $post: async () => {
        if (h.shouldThrow) throw new Error('network down');
        return h.resp;
      },
    },
  },
}));

import { makeStore } from './index';
import { addItem } from './cart-slice';
import { placeOrder } from './order-slice';

const snap = {
  variantId: 901,
  productId: 1,
  title: 'Walnut Lamp',
  optionsLabel: '',
  price: 50,
  image: '',
  stock: 5,
};

function storeWithItem() {
  const store = makeStore();
  store.dispatch(addItem(snap));
  return store;
}

describe('placeOrder thunk', () => {
  beforeEach(() => {
    h.shouldThrow = false;
    h.resp = null;
  });

  it('on 201 → success, records the order, and clears the cart', async () => {
    h.resp = { ok: true, status: 201, json: async () => ({ id: 'ord_1', total: 50 }) };
    const store = storeWithItem();
    await store.dispatch(placeOrder());
    const s = store.getState();
    expect(s.order.status).toBe('success');
    expect(s.order.last).toEqual({ id: 'ord_1', total: 50, count: 1 });
    expect(Object.keys(s.cart.items)).toHaveLength(0);
  });

  it('on 409 → error=insufficientStock and keeps the cart', async () => {
    h.resp = { ok: false, status: 409, json: async () => ({ error: 'insufficient' }) };
    const store = storeWithItem();
    await store.dispatch(placeOrder());
    const s = store.getState();
    expect(s.order.status).toBe('error');
    expect(s.order.error).toBe('insufficientStock');
    expect(Object.keys(s.cart.items)).toHaveLength(1);
  });

  it('on network throw → error=network', async () => {
    h.shouldThrow = true;
    const store = storeWithItem();
    await store.dispatch(placeOrder());
    expect(store.getState().order.error).toBe('network');
  });

  it('simulateFail short-circuits to a network error without a request', async () => {
    const store = storeWithItem();
    await store.dispatch(placeOrder({ simulateFail: true }));
    expect(store.getState().order.error).toBe('network');
  });
});

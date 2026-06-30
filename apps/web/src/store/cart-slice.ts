import {
  createSelector,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { shippingFor } from '../data/format';
import type { RootState } from './index';
import { placeOrder } from './order-slice';

// A cart line is keyed by variantId and carries a snapshot of the variant taken
// at add-time, so the cart/checkout render without refetching every variant.
// The server stays authoritative on price + stock at order time.
export type CartSnapshot = {
  variantId: number;
  productId: number;
  title: string;
  optionsLabel: string;
  price: number;
  image: string;
  stock: number;
};
export type CartEntry = CartSnapshot & { qty: number };
export type CartState = { items: Record<number, CartEntry> };

const initialState: CartState = { items: {} };

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (
      state,
      { payload }: PayloadAction<CartSnapshot & { qty?: number }>,
    ) => {
      const prev = state.items[payload.variantId]?.qty ?? 0;
      const qty = Math.max(
        0,
        Math.min(prev + (payload.qty ?? 1), payload.stock),
      );
      if (qty > 0) state.items[payload.variantId] = { ...payload, qty };
    },
    setQty: (
      state,
      { payload }: PayloadAction<{ variantId: number; qty: number }>,
    ) => {
      const entry = state.items[payload.variantId];
      if (!entry) return;
      const qty = Math.max(0, Math.min(payload.qty, entry.stock));
      if (qty <= 0) delete state.items[payload.variantId];
      else entry.qty = qty;
    },
    removeItem: (state, { payload }: PayloadAction<number>) => {
      delete state.items[payload];
    },
    clearCart: (state) => {
      state.items = {};
    },
  },
  extraReducers: (builder) => {
    builder.addCase(placeOrder.fulfilled, (state) => {
      state.items = {};
    });
  },
});

export const { addItem, setQty, removeItem, clearCart } = cartSlice.actions;
export default cartSlice.reducer;

// ── selectors ───────────────────────────────────────────────────────────────
export type CartLine = CartEntry & { line: number; atMax: boolean };

const selectItems = (s: RootState) => s.cart.items;

export const selectCartLines = createSelector(
  [selectItems],
  (items): CartLine[] =>
    Object.values(items).map((e) => ({
      ...e,
      line: e.price * e.qty,
      atMax: e.qty >= e.stock,
    })),
);

export const selectCartCount = createSelector([selectItems], (items) =>
  Object.values(items).reduce((s, e) => s + e.qty, 0),
);

export const selectSubtotal = createSelector([selectCartLines], (lines) =>
  lines.reduce((s, l) => s + l.line, 0),
);

export const selectShipping = createSelector([selectSubtotal], shippingFor);

export const selectTotal = createSelector(
  [selectSubtotal, selectShipping],
  (sub, ship) => sub + ship,
);

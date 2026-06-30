import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../api/client';
import type { RootState } from './index';

// The route returns the full Prisma order; Hono can't infer its recursive type
// through the RPC boundary, so we name the fields we actually read.
type OrderResponse = { id: string; total: number };

export type OrderResult = { id: string; total: number; count: number };
export type PlaceError = 'insufficientStock' | 'invalid' | 'network';

// Demo delivery address — shown on checkout and persisted with the order so the
// tracking screen has a real destination. A full address form is a later change.
export const DEFAULT_ADDRESS = {
  recipient: 'Alex Rivera',
  line1: '128 Linden St',
  city: 'Berlin',
  postal: '10115',
  country: 'DE',
};

export type OrderState = {
  status: 'idle' | 'placing' | 'success' | 'error';
  last: OrderResult | null;
  error: PlaceError | null;
};

const initialState: OrderState = { status: 'idle', last: null, error: null };

// Posts variant lines to the API. Price/stock are never sent — the server is
// authoritative. Status codes map to recoverable UI states:
//   201 → success · 409 → insufficient stock · 400/other → invalid · throw → network
export const placeOrder = createAsyncThunk<
  OrderResult,
  { simulateFail?: boolean } | undefined,
  { state: RootState; rejectValue: PlaceError }
>('order/place', async (arg, { getState, rejectWithValue }) => {
  // Demo affordance: force the network-error path without a real outage.
  if (arg?.simulateFail) return rejectWithValue('network');

  const items = Object.values(getState().cart.items).map((e) => ({
    variantId: e.variantId,
    quantity: e.qty,
  }));

  let res;
  try {
    res = await api.orders.$post({ json: { items, address: DEFAULT_ADDRESS } });
  } catch {
    return rejectWithValue('network');
  }

  if (res.ok) {
    const order = (await res.json()) as OrderResponse;
    const count = items.reduce((s, i) => s + i.quantity, 0);
    return { id: order.id, total: order.total, count };
  }
  if (res.status === 409) return rejectWithValue('insufficientStock');
  return rejectWithValue('invalid');
});

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    resetOrder: (state) => {
      state.status = 'idle';
      state.last = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(placeOrder.pending, (state) => {
        state.status = 'placing';
        state.error = null;
      })
      .addCase(placeOrder.fulfilled, (state, { payload }) => {
        state.status = 'success';
        state.last = payload;
      })
      .addCase(placeOrder.rejected, (state, { payload }) => {
        state.status = 'error';
        state.error = payload ?? 'network';
      });
  },
});

export const { resetOrder } = orderSlice.actions;
export default orderSlice.reducer;

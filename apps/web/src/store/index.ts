import { combineSlices, configureStore } from '@reduxjs/toolkit';
import cart from './cart-slice';
import order from './order-slice';
import saved, { loadSaved, persistSaved } from './saved-slice';

// combineSlices keeps the root reducer injectable/code-split-friendly as the
// app grows. Slices are mounted under their `name`.
const rootReducer = combineSlices({ cart, order, saved });

// Factory so tests get a fresh, isolated store per case.
export const makeStore = () =>
  configureStore({
    reducer: rootReducer,
    preloadedState: { saved: loadSaved() },
  });

export const store = makeStore();

// Persist the saved set on change (only key that needs to outlive a reload).
store.subscribe(() => persistSaved(store.getState().saved));

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

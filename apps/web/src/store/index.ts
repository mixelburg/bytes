import { combineSlices, configureStore } from '@reduxjs/toolkit';
import cart from './cart-slice';
import order from './order-slice';
import saved from './saved-slice';

// combineSlices keeps the root reducer injectable/code-split-friendly as the
// app grows. Slices are mounted under their `name`.
const rootReducer = combineSlices({ cart, order, saved });

// Factory so tests get a fresh, isolated store per case.
export const makeStore = () => configureStore({ reducer: rootReducer });

export const store = makeStore();

// Cart + saved persist to the backend per anonymous session — wired in
// store/sync.ts and started once from main.tsx (kept out of here so the store
// module stays side-effect-free for tests).

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

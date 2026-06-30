import {
  createSelector,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import type { RootState } from './index';

// Saved is just a set of product ids (a product is saved or not, regardless of
// variant). Stored as an array so it passes RTK's serializable-state check (a
// Set would not). Persistence is server-side per anonymous session — hydrated on
// load and written back via the shared session sync (see store/sync.ts).
export type SavedState = { ids: number[] };

const savedSlice = createSlice({
  name: 'saved',
  initialState: { ids: [] } as SavedState,
  reducers: {
    toggleSaved: (state, { payload }: PayloadAction<number>) => {
      const i = state.ids.indexOf(payload);
      if (i === -1) state.ids.push(payload);
      else state.ids.splice(i, 1);
    },
    removeSaved: (state, { payload }: PayloadAction<number>) => {
      const i = state.ids.indexOf(payload);
      if (i !== -1) state.ids.splice(i, 1);
    },
    clearSaved: (state) => {
      state.ids = [];
    },
    // Seed the saved set from the server on app start (session hydrate).
    hydrateSaved: (state, { payload }: PayloadAction<number[]>) => {
      state.ids = payload;
    },
  },
});

export const { toggleSaved, removeSaved, clearSaved, hydrateSaved } =
  savedSlice.actions;
export default savedSlice.reducer;

// ── selectors ───────────────────────────────────────────────────────────────
const selectIds = (s: RootState) => s.saved.ids;

export const selectSavedIds = selectIds;
export const selectSavedCount = (s: RootState) => s.saved.ids.length;
export const selectIsSaved = (id: number) =>
  createSelector([selectIds], (ids) => ids.includes(id));

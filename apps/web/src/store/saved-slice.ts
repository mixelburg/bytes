import {
  createSelector,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import type { RootState } from './index';

// Saved is just a set of product ids (a product is saved or not, regardless of
// variant). Stored as an array so it serializes straight to localStorage and
// passes RTK's serializable-state check (a Set would not).
export type SavedState = { ids: number[] };

const STORAGE_KEY = 'bytes.saved';

// Defensive load: missing/corrupt storage → empty, never throws.
export function loadSaved(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    if (Array.isArray(ids) && ids.every((n) => typeof n === 'number'))
      return { ids };
  } catch {
    /* fall through to empty */
  }
  return { ids: [] };
}

export function persistSaved(state: SavedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.ids));
  } catch {
    /* localStorage unavailable/full — degrade to in-memory for the session */
  }
}

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
  },
});

export const { toggleSaved, removeSaved, clearSaved } = savedSlice.actions;
export default savedSlice.reducer;

// ── selectors ───────────────────────────────────────────────────────────────
const selectIds = (s: RootState) => s.saved.ids;

export const selectSavedIds = selectIds;
export const selectSavedCount = (s: RootState) => s.saved.ids.length;
export const selectIsSaved = (id: number) =>
  createSelector([selectIds], (ids) => ids.includes(id));

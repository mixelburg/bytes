import { describe, it, expect, beforeEach, vi } from 'vitest';
import reducer, {
  toggleSaved,
  removeSaved,
  clearSaved,
  loadSaved,
  type SavedState,
} from './saved-slice';

const empty: SavedState = { ids: [] };

describe('saved slice', () => {
  it('toggle adds an id when absent', () => {
    expect(reducer(empty, toggleSaved(7)).ids).toEqual([7]);
  });

  it('toggle removes an id when present', () => {
    expect(reducer({ ids: [7] }, toggleSaved(7)).ids).toEqual([]);
  });

  it('toggle is the inverse of itself (no duplicates)', () => {
    let s = reducer(empty, toggleSaved(7));
    s = reducer(s, toggleSaved(7));
    s = reducer(s, toggleSaved(7));
    expect(s.ids).toEqual([7]);
  });

  it('removeSaved drops only the target id', () => {
    expect(reducer({ ids: [1, 2, 3] }, removeSaved(2)).ids).toEqual([1, 3]);
  });

  it('clearSaved empties the set', () => {
    expect(reducer({ ids: [1, 2] }, clearSaved()).ids).toEqual([]);
  });
});

describe('loadSaved', () => {
  // jsdom here doesn't expose localStorage, so stub a minimal in-memory one.
  let store: Record<string, string>;
  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => void (store[k] = v),
    });
  });

  it('returns empty when storage is missing', () => {
    expect(loadSaved()).toEqual({ ids: [] });
  });

  it('returns empty when storage is corrupt', () => {
    store['bytes.saved'] = 'not json{';
    expect(loadSaved()).toEqual({ ids: [] });
  });

  it('ignores a non-number payload', () => {
    store['bytes.saved'] = JSON.stringify(['a', 'b']);
    expect(loadSaved()).toEqual({ ids: [] });
  });

  it('rehydrates a valid id array', () => {
    store['bytes.saved'] = JSON.stringify([3, 9]);
    expect(loadSaved()).toEqual({ ids: [3, 9] });
  });
});

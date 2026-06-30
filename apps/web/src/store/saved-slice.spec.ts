import { describe, expect, it } from 'vitest';
import reducer, {
  clearSaved,
  hydrateSaved,
  removeSaved,
  type SavedState,
  toggleSaved,
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

  it('hydrateSaved replaces the set with the server payload', () => {
    expect(reducer({ ids: [1, 2] }, hydrateSaved([3, 9])).ids).toEqual([3, 9]);
  });

  it('hydrateSaved with an empty array clears the set', () => {
    expect(reducer({ ids: [1, 2] }, hydrateSaved([])).ids).toEqual([]);
  });
});

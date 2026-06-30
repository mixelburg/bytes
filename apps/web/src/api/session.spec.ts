import { beforeEach, describe, expect, it, vi } from 'vitest';

// getSessionId caches in-module, so reset modules between cases to test minting
// vs reuse from a clean slate. jsdom here lacks localStorage, so stub one.
describe('getSessionId', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    vi.resetModules();
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    });
  });

  it('mints and persists an id on first call', async () => {
    const { getSessionId } = await import('./session');
    const id = getSessionId();
    expect(id).toBeTruthy();
    expect(store['bytes.sid']).toBe(id);
  });

  it('reuses the stored id across calls', async () => {
    store['bytes.sid'] = 'fixed-id';
    const { getSessionId } = await import('./session');
    expect(getSessionId()).toBe('fixed-id');
    expect(getSessionId()).toBe('fixed-id');
  });

  it('returns a stable id even when localStorage throws', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    const { getSessionId } = await import('./session');
    const first = getSessionId();
    expect(first).toBeTruthy();
    expect(getSessionId()).toBe(first); // cached in-module
  });
});

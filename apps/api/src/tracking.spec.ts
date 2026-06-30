import { describe, it, expect } from 'vitest';
import { buildTimeline, TRACKING_DURATION_MS, type Address } from './tracking';

const addr: Address = { recipient: 'A', line1: '1 St', city: 'Berlin', postal: '10115', country: 'DE' };
const start = new Date('2026-01-01T00:00:00.000Z');
const at = (frac: number) => new Date(start.getTime() + frac * TRACKING_DURATION_MS);

describe('buildTimeline', () => {
  it('is deterministic for the same inputs', () => {
    const a = buildTimeline(start, addr, at(0.3));
    const b = buildTimeline(start, addr, at(0.3));
    expect(a).toEqual(b);
  });

  it('starts at the first stop right after placement', () => {
    const t = buildTimeline(start, addr, at(0));
    expect(t.currentIndex).toBe(0);
    expect(t.status).toBe('processing');
    expect(t.stops[0].state).toBe('current');
    expect(t.stops[1].state).toBe('pending');
  });

  it('advances the current stop as time elapses', () => {
    const early = buildTimeline(start, addr, at(0.1));
    const later = buildTimeline(start, addr, at(0.6));
    expect(later.currentIndex).toBeGreaterThan(early.currentIndex);
    expect(later.stops[early.currentIndex].state).toBe('done');
  });

  it('labels pass-points from the delivery city', () => {
    const t = buildTimeline(start, addr, at(0.3));
    expect(t.stops.some((s) => s.label.includes('Berlin'))).toBe(true);
  });

  it('marks every stop done and status delivered at the final ETA', () => {
    const t = buildTimeline(start, addr, at(1));
    expect(t.status).toBe('delivered');
    expect(t.stops.every((s) => s.state === 'done')).toBe(true);
  });

  it('falls back to a generic city label when address has none', () => {
    const t = buildTimeline(start, { ...addr, city: null }, at(0.3));
    expect(t.stops.some((s) => s.label.includes('Local'))).toBe(true);
  });
});

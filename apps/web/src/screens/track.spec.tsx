import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderApp } from '../test-utils';

// Drives the three states off a single mutable response describing GET /orders/:id.
let response: { ok: boolean; status: number; data: unknown };

const trackingOk = {
  id: 'ck_test',
  total: 89,
  createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
  address: { recipient: 'Alex Rivera', line1: '128 Linden St', city: 'Berlin', postal: '10115', country: 'DE' },
  status: 'in_transit',
  eta: new Date('2026-01-01T00:03:00Z').toISOString(),
  currentIndex: 2,
  stops: [
    { label: 'Warehouse — packed', etaAt: new Date('2026-01-01T00:00:00Z').toISOString(), state: 'done' },
    { label: 'Berlin sorting hub', etaAt: new Date('2026-01-01T00:00:36Z').toISOString(), state: 'done' },
    { label: 'In transit', etaAt: new Date('2026-01-01T00:01:30Z').toISOString(), state: 'current' },
    { label: 'Berlin local depot', etaAt: new Date('2026-01-01T00:02:24Z').toISOString(), state: 'pending' },
    { label: 'Your address', etaAt: new Date('2026-01-01T00:03:00Z').toISOString(), state: 'pending' },
  ],
};

vi.mock('../api/client', () => ({
  api: {
    products: { $get: async () => ({ ok: true, status: 200, json: async () => ({ items: [], total: 0, page: 1, limit: 12, hasMore: false }) }) },
    categories: { $get: async () => ({ ok: true, status: 200, json: async () => [] }) },
    orders: {
      ':id': {
        $get: async () => ({ ok: response.ok, status: response.status, json: async () => response.data }),
      },
    },
  },
}));

describe('TrackScreen', () => {
  it('renders the route, stops and ETA on success', async () => {
    response = { ok: true, status: 200, data: trackingOk };
    renderApp('/track/ck_test');
    expect(await screen.findByText('Berlin sorting hub')).toBeTruthy();
    expect(screen.getByText('Your address')).toBeTruthy();
    expect(screen.getByText(/stops passed/i)).toBeTruthy();
    expect(screen.getByText(/128 Linden St/)).toBeTruthy();
  });

  it('shows the not-found state on 404', async () => {
    response = { ok: false, status: 404, data: { error: 'not found' } };
    renderApp('/track/missing');
    expect(await screen.findByText(/order not found/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /back to products/i })).toBeTruthy();
  });

  it('shows the error state with retry on server error', async () => {
    response = { ok: false, status: 500, data: { error: 'boom' } };
    renderApp('/track/ck_test');
    expect(await screen.findByText(/couldn’t load tracking/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
  });
});

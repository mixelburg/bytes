import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { renderApp } from '../test-utils';

// Fixtures shaped like the real API responses.
const LIST = [
  {
    id: 1,
    title: 'Walnut Lamp',
    category: 'home',
    image: '',
    rating: 4.7,
    priceMin: 89,
    priceMax: 89,
    inStock: true,
  },
  {
    id: 2,
    title: 'Field Backpack',
    category: 'outdoor',
    image: '',
    rating: 4.8,
    priceMin: 54,
    priceMax: 98,
    inStock: true,
  },
  {
    id: 3,
    title: 'Wool Sweater',
    category: 'clothes',
    image: '',
    rating: 4.5,
    priceMin: 96,
    priceMax: 96,
    inStock: false,
  },
];

const detailFor = (id: number) => ({
  id,
  title: LIST.find((p) => p.id === id)?.title ?? 'Item',
  description: 'A nice thing.',
  category: 'home',
  image: '',
  rating: 4.7,
  priceMin: 89,
  priceMax: 89,
  variants: [
    {
      id: 900 + id,
      productId: id,
      options: {},
      optionsLabel: '',
      price: 89,
      stock: 10,
      image: '',
    },
  ],
});

const ok = (data: unknown) => ({
  ok: true,
  status: 200,
  json: async () => data,
});

vi.mock('../api/client', () => ({
  api: {
    products: {
      $get: async ({ query }: { query: Record<string, string> }) => {
        const q = (query.search ?? '').toLowerCase();
        const filtered = LIST.filter((p) => p.title.toLowerCase().includes(q));
        const limit = Number(query.limit);
        const page = Number(query.page);
        return ok({
          items: filtered.slice(0, page * limit),
          total: filtered.length,
          page,
          limit,
          hasMore: page * limit < filtered.length,
        });
      },
      ':id': {
        $get: async ({ param }: { param: { id: string } }) =>
          ok(detailFor(Number(param.id))),
      },
    },
    categories: { $get: async () => ok(['home', 'outdoor', 'clothes']) },
    orders: {
      $post: async () => ({
        ok: true,
        status: 201,
        json: async () => ({ id: 'ck_test', total: 89 }),
      }),
    },
  },
}));

describe('Marketplace (mocked API)', () => {
  it('loads the catalog list from the API', async () => {
    renderApp();
    expect(screen.getByRole('heading', { name: /market/i })).toBeTruthy();
    expect(await screen.findByText(/3 results/i)).toBeTruthy();
    expect(await screen.findByText('Walnut Lamp')).toBeTruthy();
  });

  it('quick-adds a product (resolving its variant) to the cart', async () => {
    const { store } = renderApp();
    const addButtons = await screen.findAllByRole('button', {
      name: /add .* to cart/i,
    });
    fireEvent.click(addButtons[0]);
    await waitFor(() =>
      expect(
        Object.values(store.getState().cart.items).reduce(
          (s, e) => s + e.qty,
          0,
        ),
      ).toBe(1),
    );
    expect(screen.getAllByText(/cart \(1\)/i).length).toBeGreaterThan(0);
  });

  it('shows the empty state for a no-match search', async () => {
    renderApp();
    await screen.findByText(/3 results/i);
    fireEvent.change(screen.getByLabelText(/search products/i), {
      target: { value: 'zzz-nope' },
    });
    expect(await screen.findByText(/no matches/i)).toBeTruthy();
  });
});

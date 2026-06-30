import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { api } from '../api/client';

// Types flow from the backend's route definitions — single source of truth.
export type ListItem = InferResponseType<
  typeof api.products.$get
>['items'][number];
export type ProductDetail = InferResponseType<
  (typeof api.products)[':id']['$get'],
  200
>;
export type Variant = ProductDetail['variants'][number];

export const PAGE_SIZE = 12;

// UI sort keys == API sort keys.
export const SORTS = {
  newest: 'Newest',
  'price-asc': 'Price · Low to high',
  'price-desc': 'Price · High to low',
  'rating-desc': 'Top rated',
} as const;
export type SortKey = keyof typeof SORTS;

export type CatalogParams = {
  search: string;
  category: string; // '' = all
  sort: SortKey;
};

export function useCatalog({ search, category, sort }: CatalogParams) {
  return useInfiniteQuery({
    queryKey: ['catalog', { search, category, sort }],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await api.products.$get({
        query: {
          page: String(pageParam),
          limit: String(PAGE_SIZE),
          search,
          category,
          sort,
        },
      });
      if (!res.ok) throw new Error('Failed to load products');
      return res.json();
    },
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.categories.$get();
      if (!res.ok) throw new Error('Failed to load categories');
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}

export class NotFoundError extends Error {}

// Shared so the detail screen (useProduct) and the saved screen (useQueries)
// hit the same ['product', id] cache entry.
export function productQueryOptions(id: number | string) {
  return {
    queryKey: ['product', String(id)] as const,
    queryFn: async (): Promise<ProductDetail> => {
      const res = await api.products[':id'].$get({ param: { id: String(id) } });
      if (res.status === 404) throw new NotFoundError('Product not found');
      if (!res.ok) throw new Error('Failed to load product');
      return res.json();
    },
  };
}

export function useProduct(id: string | undefined) {
  return useQuery({ ...productQueryOptions(id ?? ''), enabled: !!id });
}

export type OrderSummary = InferResponseType<typeof api.orders.$get, 200>[number];

// The current session's past orders (newest first). Pure server read.
export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async (): Promise<OrderSummary[]> => {
      const res = await api.orders.$get();
      if (!res.ok) throw new Error('Failed to load orders');
      return res.json();
    },
  });
}

export type TrackedOrder = InferResponseType<
  (typeof api.orders)[':id']['$get'],
  200
>;

// Polls the deterministic timeline so the route advances live; stops once
// delivered. 404 surfaces as NotFoundError for the not-found state.
export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['order', String(id)] as const,
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === 'delivered' ? false : 5_000,
    queryFn: async (): Promise<TrackedOrder> => {
      const res = await api.orders[':id'].$get({ param: { id: String(id) } });
      if (res.status === 404) throw new NotFoundError('Order not found');
      if (!res.ok) throw new Error('Failed to load order');
      return res.json();
    },
  });
}

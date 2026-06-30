import { QueryClient } from '@tanstack/react-query';

// Shared query client. Defaults tuned for a catalog: product data tolerates
// brief staleness, and refetch-on-focus would be noisy while browsing.
// ponytail: one client, defaults only — per-query overrides live with each query.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { SnackbarProvider } from 'notistack';
import type { ReactElement } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from './router';
import { makeStore } from './store';
import theme from './theme';

/** Render the full app (fresh store + query client) at a given route. */
export function renderApp(initial = '/') {
  const store = makeStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [initial] });
  const utils = render(
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <SnackbarProvider>
            <RouterProvider router={router} />
          </SnackbarProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ReduxProvider>,
  );
  return { store, ...utils };
}

/** Render an isolated element with store + theme + query (no router). */
export function renderWithProviders(ui: ReactElement) {
  const store = makeStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    store,
    ...render(
      <ReduxProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <SnackbarProvider>{ui}</SnackbarProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ReduxProvider>,
    ),
  };
}

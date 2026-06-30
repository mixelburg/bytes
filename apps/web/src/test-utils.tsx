import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { Provider as ReduxProvider } from 'react-redux';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import theme from './theme';
import { makeStore } from './store';
import { routes } from './router';

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
    </ReduxProvider>
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
      </ReduxProvider>
    ),
  };
}

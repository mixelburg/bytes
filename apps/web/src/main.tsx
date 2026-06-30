import isPropValid from '@emotion/is-prop-valid';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import {
  StyledEngineProvider,
  styled,
  ThemeProvider,
} from '@mui/material/styles';
import { QueryClientProvider } from '@tanstack/react-query';
import { MaterialDesignContent, SnackbarProvider } from 'notistack';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { Provider as ReduxProvider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { StyleSheetManager } from 'styled-components';
import { queryClient } from './query-client';
import { router } from './router';
import { store } from './store';
import theme, { mono } from './theme';

// styled-components v6 no longer filters props on its own. Without this, MUI
// system props (Stack's direction/alignItems/justifyContent, etc.) leak onto
// DOM nodes and React warns. Filter only for host (string) elements — but keep
// aria-*/data-*/role, which is-prop-valid rejects yet the DOM needs.
const shouldForwardProp = (prop: string, element: unknown) => {
  if (typeof element !== 'string') return true;
  if (prop === 'role' || prop.startsWith('aria-') || prop.startsWith('data-'))
    return true;
  return isPropValid(prop);
};

// Motion primitives the screens reference (animation: 'mslide' | 'mpop').
const keyframes = (
  <GlobalStyles
    styles={{
      '@keyframes mslide': {
        '0%': { transform: 'translateY(8px)', opacity: 0 },
        '100%': { transform: 'translateY(0)', opacity: 1 },
      },
      '@keyframes mpop': {
        '0%': { transform: 'scale(.85)', opacity: 0 },
        '100%': { transform: 'scale(1)', opacity: 1 },
      },
      '@media (prefers-reduced-motion: reduce)': {
        '*': { animation: 'none !important' },
      },
    }}
  />
);

// Mono Editorial toasts: paper tile, hard 1.5px ink border, squared, mono copy.
// Variants share the ink frame; only the status icon carries color.
const Toast = styled(MaterialDesignContent)(({ theme }) => {
  const v = theme.vars ?? theme;
  return {
    borderRadius: 0,
    border: `1.5px solid ${v.palette.primary.main}`,
    backgroundColor: v.palette.background.paper,
    color: v.palette.text.primary,
    boxShadow: 'none',
    fontFamily: mono,
    fontWeight: 600,
    letterSpacing: '0.02em',
    '& #notistack-snackbar': { padding: 0 },
    '&.notistack-MuiContent-error': { color: v.palette.errtext },
  };
});

const toastComponents = {
  default: Toast,
  success: Toast,
  error: Toast,
  warning: Toast,
  info: Toast,
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <StyleSheetManager shouldForwardProp={shouldForwardProp}>
      <ReduxProvider store={store}>
        <QueryClientProvider client={queryClient}>
          {/* injectFirst: styled-components styles load before MUI's so overrides win */}
          <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme} defaultMode="system">
              <CssBaseline />
              {keyframes}
              <SnackbarProvider
                maxSnack={3}
                autoHideDuration={4000}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                Components={toastComponents}
              >
                <RouterProvider router={router} />
              </SnackbarProvider>
            </ThemeProvider>
          </StyledEngineProvider>
        </QueryClientProvider>
      </ReduxProvider>
    </StyleSheetManager>
  </StrictMode>,
);

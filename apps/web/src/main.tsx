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
import { initSessionSync } from './store/sync';
import theme, { mono } from './theme';

// Hydrate cart + saved from the backend session and start the write-back sync.
initSessionSync();

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
      // Skeleton breathing, scrim fade, image-load shimmer sweep.
      '@keyframes mpulse': {
        '0%,100%': { opacity: 0.55 },
        '50%': { opacity: 0.85 },
      },
      '@keyframes mfade': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
      '@keyframes mshimmer': {
        '0%': { transform: 'translateX(-100%)' },
        '100%': { transform: 'translateX(100%)' },
      },
      // Route-track draw-in (scaleY from the top) and confirm checkmark stroke.
      '@keyframes mdraw': {
        '0%': { transform: 'scaleY(0)' },
        '100%': { transform: 'scaleY(1)' },
      },
      // path uses pathLength=1, so the stroke draws from 1 → 0; resting state
      // is 0 (fully drawn) so reduced-motion shows the complete checkmark.
      '@keyframes mcheck': {
        '0%': { strokeDashoffset: 1 },
        '100%': { strokeDashoffset: 0 },
      },
      // Toast auto-hide countdown hairline (scaleX 1 → 0).
      '@keyframes mcountdown': {
        '0%': { transform: 'scaleX(1)' },
        '100%': { transform: 'scaleX(0)' },
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
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 0,
    border: `1.5px solid ${v.palette.primary.main}`,
    backgroundColor: v.palette.background.paper,
    color: v.palette.text.primary,
    boxShadow: 'none',
    fontFamily: mono,
    fontWeight: 600,
    letterSpacing: '0.02em',
    animation: 'mslide .22s ease both',
    '& #notistack-snackbar': { padding: 0 },
    '&.notistack-MuiContent-error': { color: v.palette.errtext },
    // hairline that depletes over the 4s auto-hide window
    '&::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      bottom: 0,
      height: 2,
      width: '100%',
      transformOrigin: 'left',
      backgroundColor: v.palette.primary.main,
      animation: 'mcountdown 4s linear forwards',
    },
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

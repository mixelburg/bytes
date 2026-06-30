import Box from '@mui/material/Box';
import { styled, useColorScheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { mono } from '../components/ui';
import { selectCartCount } from '../store/cart-slice';
import { useAppSelector } from '../store/hooks';
import { selectSavedCount } from '../store/saved-slice';

const Canvas = styled('div')(({ theme }) => ({
  minHeight: '100dvh',
  background: theme.vars!.palette.background.default,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  padding: theme.spacing(0),
  [theme.breakpoints.up('sm')]: { padding: theme.spacing(4, 2.5) },
}));

const AppSurface = styled('div')(({ theme }) => ({
  width: '100%',
  maxWidth: 1080,
  minHeight: '100dvh',
  background: theme.vars!.palette.background.paper,
  display: 'flex',
  flexDirection: 'column',
  [theme.breakpoints.up('sm')]: {
    minHeight: 0,
    border: `1.5px solid ${theme.vars!.palette.primary.main}`,
  },
}));

const NAV_ROUTES = ['/', '/saved', '/cart'];

export default function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const count = useAppSelector(selectCartCount);
  const savedCount = useAppSelector(selectSavedCount);
  const { mode, systemMode, setMode } = useColorScheme();
  const resolved = mode === 'system' ? systemMode : mode;

  const showNav = NAV_ROUTES.includes(pathname);
  const onShop = pathname === '/';
  const onSaved = pathname === '/saved';
  const onCart = pathname === '/cart';

  return (
    <Canvas>
      <AppSurface>
        {/* top bar */}
        <Box
          sx={{
            flex: 'none',
            height: 60,
            px: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            borderBottom: '1.5px solid',
            borderColor: 'primary.main',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            bgcolor: 'background.paper',
          }}
        >
          <Typography
            variant="h5"
            component="div"
            onClick={() => navigate('/')}
            sx={{
              cursor: 'pointer',
              letterSpacing: '-0.03em',
              fontWeight: 800,
            }}
          >
            Market
          </Typography>
          <Box
            sx={{
              ml: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            <Box
              role="button"
              aria-label="Toggle theme"
              onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')}
              sx={{
                cursor: 'pointer',
                fontFamily: mono,
                fontSize: 10,
                letterSpacing: '0.06em',
                color: 'text.disabled',
                px: 1,
                py: 0.75,
              }}
            >
              {resolved === 'dark' ? '☾ DARK' : '☀ LIGHT'}
            </Box>
            <Box
              role="button"
              aria-label="Cart"
              onClick={() => navigate('/cart')}
              sx={{
                cursor: 'pointer',
                border: '1.5px solid',
                borderColor: 'primary.main',
                height: 38,
                px: 1.75,
                display: 'flex',
                alignItems: 'center',
                fontFamily: mono,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              CART{count > 0 ? ` (${count})` : ''}
            </Box>
          </Box>
        </Box>

        {/* screen */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <Outlet />
        </Box>

        {/* bottom nav (mobile) */}
        {showNav && (
          <Box
            sx={{
              flex: 'none',
              display: { xs: 'flex', sm: 'none' },
              justifyContent: 'space-around',
              alignItems: 'center',
              borderTop: '1.5px solid',
              borderColor: 'primary.main',
              py: 1.5,
              pb: 'calc(12px + env(safe-area-inset-bottom))',
              position: 'sticky',
              bottom: 0,
              bgcolor: 'background.paper',
            }}
          >
            {[
              { label: 'SHOP', active: onShop, go: () => navigate('/') },
              {
                label: `SAVED${savedCount > 0 ? ` (${savedCount})` : ''}`,
                active: onSaved,
                go: () => navigate('/saved'),
              },
              {
                label: `CART${count > 0 ? ` (${count})` : ''}`,
                active: onCart,
                go: () => navigate('/cart'),
              },
              { label: 'ME', active: false },
            ].map((n) => (
              <Box
                key={n.label}
                role={n.go ? 'button' : undefined}
                onClick={n.go}
                sx={{
                  cursor: n.go ? 'pointer' : 'default',
                  fontFamily: mono,
                  fontSize: 10,
                  letterSpacing: '0.04em',
                  fontWeight: n.active ? 600 : 400,
                  color: n.active ? 'text.primary' : 'text.disabled',
                }}
              >
                {n.label}
              </Box>
            ))}
          </Box>
        )}
      </AppSurface>
    </Canvas>
  );
}

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mono, Rolling, SectionLabel } from '../components/ui';
import { money } from '../data/format';
import {
  selectCartCount,
  selectCartLines,
  selectShipping,
  selectTotal,
} from '../store/cart-slice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  DEFAULT_ADDRESS,
  type PlaceError,
  placeOrder,
} from '../store/order-slice';
import { mono } from '../theme';

const ERROR_COPY: Record<PlaceError, string> = {
  insufficientStock:
    '⚠ One or more items just went out of stock. Your cart is unchanged — please review quantities and try again.',
  invalid:
    '⚠ We couldn’t place this order. No charge was made — please try again.',
  network:
    '⚠ Payment couldn’t be processed. No charge was made — please try again.',
};

function InfoCard({ title, sub }: { title: string; sub?: string }) {
  return (
    <Box
      sx={{
        mt: 1,
        border: '1.5px solid',
        borderColor: 'primary.main',
        p: 1.75,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Box>
        <Box sx={{ fontSize: 13, fontWeight: 600 }}>{title}</Box>
        {sub && (
          <Box sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
            {sub}
          </Box>
        )}
      </Box>
      <Mono sx={{ color: 'text.primary' }}>EDIT</Mono>
    </Box>
  );
}

export default function CheckoutScreen() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const lines = useAppSelector(selectCartLines);
  const count = useAppSelector(selectCartCount);
  const shipping = useAppSelector(selectShipping);
  const total = useAppSelector(selectTotal);
  const status = useAppSelector((s) => s.order.status);
  const errorReason = useAppSelector((s) => s.order.error);
  const [fail, setFail] = useState(false);

  useEffect(() => {
    if (status === 'success') navigate('/confirm', { replace: true });
    else if (lines.length === 0 && status === 'idle')
      navigate('/cart', { replace: true });
  }, [status, lines.length, navigate]);

  // A stock conflict means our snapshots are stale — refresh the catalog.
  useEffect(() => {
    if (status === 'error' && errorReason === 'insufficientStock') {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
    }
  }, [status, errorReason, queryClient]);

  const placing = status === 'placing';
  const shippingLabel = shipping === 0 ? 'FREE' : money(shipping);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        animation: 'mslide .25s ease both',
      }}
    >
      <Box sx={{ px: 2.5, pt: 1.5 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: 24 }}>
          Checkout
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          px: 2.5,
          py: 2,
          maxWidth: 560,
          width: '100%',
          mx: 'auto',
        }}
      >
        <SectionLabel>DELIVER TO</SectionLabel>
        <InfoCard
          title={DEFAULT_ADDRESS.recipient}
          sub={`${DEFAULT_ADDRESS.line1} · ${DEFAULT_ADDRESS.city} ${DEFAULT_ADDRESS.postal}`}
        />

        <Box sx={{ mt: 2.5 }}>
          <SectionLabel>PAYMENT</SectionLabel>
        </Box>
        <InfoCard title="Visa ···· 4242" />

        <Box sx={{ mt: 2.5 }}>
          <SectionLabel>
            ORDER · {count} {count === 1 ? 'ITEM' : 'ITEMS'}
          </SectionLabel>
        </Box>
        <Box sx={{ mt: 1, border: '1px solid', borderColor: 'divider' }}>
          {lines.map((l) => (
            <Box
              key={l.variantId}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                p: 1.4,
                borderBottom: '1px solid',
                borderColor: 'divider',
                fontSize: 12,
              }}
            >
              <span>
                {l.qty}× {l.title}
                {l.optionsLabel ? ` (${l.optionsLabel})` : ''}
              </span>
              <Box component="span" sx={{ fontFamily: mono }}>
                {money(l.line)}
              </Box>
            </Box>
          ))}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              p: 1.4,
              fontSize: 12,
              color: 'text.secondary',
            }}
          >
            <span>Shipping</span>
            <Box component="span" sx={{ fontFamily: mono }}>
              {shippingLabel}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 17,
            fontWeight: 800,
            mt: 2,
            pt: 1.5,
            borderTop: '1.5px solid',
            borderColor: 'primary.main',
          }}
        >
          <span>Total</span>
          <Box component="span" sx={{ fontFamily: mono }}>
            <Rolling value={total} format={(n) => money(Math.round(n))} />
          </Box>
        </Box>

        <Box
          role="button"
          onClick={() => setFail((f) => !f)}
          sx={{
            mt: 2.25,
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            fontSize: 11,
            color: 'text.secondary',
            cursor: 'pointer',
          }}
        >
          <Box
            sx={{
              width: 16,
              height: 16,
              border: '1.5px solid',
              borderColor: 'text.secondary',
              display: 'grid',
              placeItems: 'center',
              fontSize: 11,
              color: 'text.primary',
            }}
          >
            {fail ? '✕' : ''}
          </Box>
          Simulate network failure (demo)
        </Box>

        {status === 'error' && errorReason && (
          <Box
            sx={{
              mt: 1.75,
              border: '1.5px solid #c0392b',
              bgcolor: 'errbg',
              p: 1.5,
              fontSize: 12,
              color: '#d0503f',
              lineHeight: 1.5,
              animation: 'mpop .2s ease both',
            }}
          >
            {ERROR_COPY[errorReason]}
          </Box>
        )}
      </Box>

      <Box
        sx={{
          flex: 'none',
          p: 2.5,
          pb: 'calc(20px + env(safe-area-inset-bottom))',
          borderTop: '1.5px solid',
          borderColor: 'primary.main',
          position: 'sticky',
          bottom: 0,
          bgcolor: 'background.paper',
        }}
      >
        <Button
          variant="contained"
          fullWidth
          disabled={placing}
          onClick={() => dispatch(placeOrder({ simulateFail: fail }))}
          sx={{ height: 52, fontSize: 14, gap: 1.25 }}
        >
          {placing && (
            <CircularProgress
              size={16}
              sx={{ color: 'primary.contrastText' }}
            />
          )}
          {placing ? 'Placing order…' : `Place order — ${money(total)}`}
        </Button>
      </Box>
    </Box>
  );
}

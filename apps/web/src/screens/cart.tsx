  import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import {
  CenterState,
  Mono,
  ProductImage,
  QtyStepper,
  Rolling,
  SectionLabel,
} from '../components/ui';
import { money } from '../data/format';
import { staggerDelay } from '../motion';
import {
  removeItem,
  selectCartCount,
  selectCartLines,
  selectShipping,
  selectSubtotal,
  selectTotal,
  setQty,
} from '../store/cart-slice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { mono } from '../theme';

export default function CartScreen() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const lines = useAppSelector(selectCartLines);
  const count = useAppSelector(selectCartCount);
  const subtotal = useAppSelector(selectSubtotal);
  const shipping = useAppSelector(selectShipping);
  const total = useAppSelector(selectTotal);

  if (lines.length === 0) {
    return (
      <CenterState
        glyph="🛒"
        title="Your cart is empty"
        body="Add a few things and they’ll show up here."
      >
        <Button
          variant="contained"
          sx={{ mt: 2.5, height: 46, px: 3 }}
          onClick={() => navigate('/')}
        >
          Start shopping
        </Button>
      </CenterState>
    );
  }

  const shippingLabel =
    shipping === 0 ? (subtotal > 0 ? 'FREE' : '$0') : money(shipping);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        flex: 1,
        minHeight: 0,
      }}
    >
      <Box sx={{ flex: 1, px: 2.5, pt: 1.5, pb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: 24 }}>
          Cart{' '}
          <Box
            component="span"
            sx={{
              fontFamily: mono,
              fontSize: 13,
              fontWeight: 400,
              color: 'text.disabled',
            }}
          >
            · {count} {count === 1 ? 'ITEM' : 'ITEMS'}
          </Box>
        </Typography>

        {lines.map((l, i) => (
          <Box
            key={l.variantId}
            style={{ animationDelay: staggerDelay(i) }}
            sx={{
              display: 'flex',
              gap: 1.75,
              py: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              animation: 'mslide .25s ease both',
            }}
          >
            <Box
              onClick={() => navigate(`/p/${l.productId}`)}
              sx={{
                position: 'relative',
                width: 84,
                height: 84,
                flex: 'none',
                cursor: 'pointer',
              }}
            >
              <ProductImage src={l.image} alt={l.title} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Typography
                  sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}
                >
                  {l.title}
                </Typography>
                <Box
                  role="button"
                  aria-label={`Remove ${l.title}`}
                  onClick={() => dispatch(removeItem(l.variantId))}
                  sx={{
                    cursor: 'pointer',
                    fontSize: 13,
                    color: 'text.disabled',
                  }}
                >
                  ✕
                </Box>
              </Box>
              <Mono sx={{ display: 'block', mt: 0.5, fontSize: 10 }}>
                {l.optionsLabel ? `${l.optionsLabel.toUpperCase()} · ` : ''}
                {money(l.price)} EA
              </Mono>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 1.25,
                }}
              >
                <QtyStepper
                  qty={l.qty}
                  canInc={!l.atMax}
                  onDec={() =>
                    dispatch(setQty({ variantId: l.variantId, qty: l.qty - 1 }))
                  }
                  onInc={() =>
                    dispatch(setQty({ variantId: l.variantId, qty: l.qty + 1 }))
                  }
                  cell={30}
                  height={30}
                />
                <Box sx={{ fontFamily: mono, fontSize: 14, fontWeight: 600 }}>
                  {money(l.line)}
                </Box>
              </Box>
              {l.atMax && (
                <Box
                  sx={{
                    fontFamily: mono,
                    fontSize: 9,
                    color: '#d05a4a',
                    mt: 0.75,
                  }}
                >
                  MAX STOCK REACHED
                </Box>
              )}
            </Box>
          </Box>
        ))}
      </Box>

      {/* summary */}
      <Box
        sx={{
          flex: 'none',
          width: { xs: '100%', sm: 320 },
          borderTop: { xs: '1.5px solid', sm: 'none' },
          borderLeft: { xs: 'none', sm: '1px solid' },
          borderColor: { xs: 'primary.main', sm: 'divider' },
          p: { xs: 2.5, sm: 3.5 },
          position: { xs: 'sticky', sm: 'static' },
          bottom: 0,
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: { xs: 'none', sm: 'block' }, mb: 2 }}>
          <SectionLabel>SUMMARY</SectionLabel>
        </Box>
        <Row label="Subtotal" value={money(subtotal)} />
        <Row label="Shipping" value={shippingLabel} />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 16,
            fontWeight: 800,
            pt: 1.25,
            mt: 1.25,
            borderTop: '1px solid',
            borderColor: 'primary.main',
          }}
        >
          <span>Total</span>
          <Box component="span" sx={{ fontFamily: mono }}>
            <Rolling value={total} format={(n) => money(Math.round(n))} />
          </Box>
        </Box>
        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 2, height: 52, fontSize: 14 }}
          onClick={() => navigate('/checkout')}
        >
          Checkout —{' '}
          <Rolling value={total} format={(n) => money(Math.round(n))} />
        </Button>
        {subtotal > 0 && subtotal < 75 && (
          <Mono
            sx={{
              display: 'block',
              textAlign: 'center',
              mt: 1.5,
              fontSize: 10,
            }}
          >
            FREE SHIPPING OVER $75
          </Mono>
        )}
      </Box>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 13,
        color: 'text.secondary',
        mb: 1,
      }}
    >
      <span>{label}</span>
      <Box component="span" sx={{ fontFamily: mono, color: 'text.primary' }}>
        {value}
      </Box>
    </Box>
  );
}

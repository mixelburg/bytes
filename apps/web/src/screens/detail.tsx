import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CenterState,
  Mono,
  ProductImage,
  QtyStepper,
  Rolling,
} from '../components/ui';
import { money, stockColor } from '../data/format';
import { NotFoundError, useProduct, type Variant } from '../data/queries';
import { tapHaptic } from '../haptics';
import { flyToCart } from '../motion';
import { addItem } from '../store/cart-slice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleSaved } from '../store/saved-slice';
import { mono } from '../theme';

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        p: 1.5,
        textAlign: 'center',
        fontFamily: mono,
        fontSize: 12,
        '&:not(:last-of-type)': {
          borderRight: '1px solid',
          borderColor: 'primary.main',
        },
      }}
    >
      <Box sx={{ color: 'text.disabled' }}>{label}</Box>
      <Box sx={{ fontWeight: 600, mt: 0.5, color: color ?? 'text.primary' }}>
        {value}
      </Box>
    </Box>
  );
}

export default function DetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { data: p, isLoading, error } = useProduct(id);
  const saved = useAppSelector((s) => (p ? s.saved.ids.includes(p.id) : false));
  const [variantId, setVariantId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const imgRef = useRef<HTMLDivElement>(null);

  // Default to the first in-stock variant (or the first variant).
  const selected = useMemo<Variant | undefined>(() => {
    if (!p) return undefined;
    if (variantId != null) return p.variants.find((v) => v.id === variantId);
    return p.variants.find((v) => v.stock > 0) ?? p.variants[0];
  }, [p, variantId]);

  if (error) {
    const notFound = error instanceof NotFoundError;
    return (
      <CenterState
        glyph={notFound ? '∅' : '!'}
        title={notFound ? 'Product unavailable' : 'Couldn’t load product'}
        body={
          notFound
            ? 'We couldn’t find that item. It may have sold out or been removed.'
            : 'Something went wrong. Please try again.'
        }
      >
        <Button
          variant="contained"
          sx={{ mt: 2.5, height: 46, px: 3 }}
          onClick={() => navigate('/')}
        >
          Back to products
        </Button>
      </CenterState>
    );
  }

  if (isLoading || !p || !selected) {
    return (
      <Box sx={{ p: 2.5 }}>
        <Skeleton
          variant="rectangular"
          sx={{
            width: '100%',
            aspectRatio: { xs: '1.1', sm: '2' },
            bgcolor: 'tile',
          }}
        />
        <Skeleton width="55%" height={40} sx={{ mt: 2 }} />
        <Skeleton width="80%" />
        <Skeleton width="70%" />
      </Box>
    );
  }

  const soldOut = selected.stock <= 0;
  const total = selected.price * qty;
  const pickVariant = (v: Variant) => {
    setVariantId(v.id);
    setQty(1);
  };

  const onAdd = () => {
    if (imgRef.current) flyToCart(imgRef.current);
    tapHaptic();
    dispatch(
      addItem({
        variantId: selected.id,
        productId: p.id,
        title: p.title,
        optionsLabel: selected.optionsLabel,
        price: selected.price,
        image: selected.image || p.image,
        stock: selected.stock,
        qty,
      }),
    );
  };

  const actions = soldOut ? (
    <Box
      sx={{
        flex: 1,
        bgcolor: 'field',
        color: 'text.disabled',
        display: 'grid',
        placeItems: 'center',
        fontSize: 14,
        fontWeight: 700,
        height: 52,
      }}
    >
      SOLD OUT
    </Box>
  ) : (
    <>
      <QtyStepper
        qty={qty}
        canInc={qty < selected.stock}
        onDec={() => setQty(Math.max(1, qty - 1))}
        onInc={() => setQty(Math.min(selected.stock, qty + 1))}
        height={52}
        cell={42}
      />
      <Button
        variant="contained"
        onClick={onAdd}
        sx={{ flex: 1, height: 52, fontSize: 14 }}
      >
        Add · <Rolling value={total} format={(n) => money(Math.round(n))} />
      </Button>
    </>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        animation: 'mslide .25s ease both',
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: { xs: 'none', sm: 'block' }, px: 5, pt: 3 }}>
          <Mono
            role="button"
            onClick={() => navigate(-1)}
            sx={{ cursor: 'pointer', color: 'text.secondary' }}
          >
            ‹ BACK TO PRODUCTS
          </Mono>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 0, sm: 5 },
            alignItems: 'flex-start',
            px: { xs: 0, sm: 5 },
            pt: { xs: 0, sm: 2.5 },
          }}
        >
          {/* image */}
          <Box
            ref={imgRef}
            sx={{
              position: 'relative',
              width: { xs: '100%', sm: 440 },
              flex: 'none',
              height: { xs: 320, sm: 440 },
            }}
          >
            <ProductImage src={selected.image || p.image} alt={p.title} />
            <Box
              role="button"
              aria-label="Back"
              onClick={() => navigate(-1)}
              sx={{
                display: { xs: 'grid', sm: 'none' },
                placeItems: 'center',
                position: 'absolute',
                top: 14,
                left: 20,
                width: 38,
                height: 38,
                border: '1.5px solid',
                borderColor: 'primary.main',
                bgcolor: 'background.paper',
                fontSize: 17,
                cursor: 'pointer',
              }}
            >
              ‹
            </Box>
            <Box
              role="button"
              aria-label={saved ? 'Remove from saved' : 'Save'}
              aria-pressed={saved}
              onClick={() => dispatch(toggleSaved(p.id))}
              sx={{
                display: 'grid',
                placeItems: 'center',
                position: 'absolute',
                top: 14,
                right: 20,
                width: 38,
                height: 38,
                border: '1.5px solid',
                borderColor: 'primary.main',
                bgcolor: 'background.paper',
                fontSize: 17,
                cursor: 'pointer',
              }}
            >
              {saved ? '♥' : '♡'}
            </Box>
          </Box>

          {/* info */}
          <Box
            sx={{
              flex: 1,
              px: { xs: 2.5, sm: 0 },
              pt: { xs: 2.5, sm: 0.75 },
              pb: 3,
              minWidth: 0,
            }}
          >
            <Mono sx={{ letterSpacing: '0.05em' }}>
              {p.category.toUpperCase()}
            </Mono>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 2,
                mt: 0.75,
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: 25, sm: 34 },
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                }}
              >
                {p.title}
              </Typography>
              <Box
                sx={{
                  fontFamily: mono,
                  fontSize: { xs: 22, sm: 28 },
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {money(selected.price)}
              </Box>
            </Box>

            {/* variant picker */}
            {p.variants.length > 1 && (
              <Box sx={{ mt: 2 }}>
                <Mono sx={{ letterSpacing: '0.06em' }}>OPTIONS</Mono>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {p.variants.map((v) => {
                    const active = v.id === selected.id;
                    return (
                      <Box
                        key={v.id}
                        role="button"
                        aria-pressed={active}
                        onClick={() => pickVariant(v)}
                        sx={{
                          cursor: 'pointer',
                          px: 1.5,
                          py: 0.75,
                          border: '1.5px solid',
                          borderColor: 'primary.main',
                          fontFamily: mono,
                          fontSize: 11,
                          letterSpacing: '0.03em',
                          bgcolor: active ? 'primary.main' : 'transparent',
                          color: active
                            ? 'primary.contrastText'
                            : v.stock > 0
                              ? 'text.primary'
                              : 'text.disabled',
                          textDecoration: v.stock > 0 ? 'none' : 'line-through',
                        }}
                      >
                        {v.optionsLabel || 'Default'}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* stats */}
            <Box
              sx={{
                mt: 2,
                display: 'flex',
                border: '1px solid',
                borderColor: 'primary.main',
                maxWidth: 380,
              }}
            >
              <Stat label="RATING" value={`★ ${p.rating.toFixed(1)}`} />
              <Stat
                label="STOCK"
                value={soldOut ? '0' : String(selected.stock)}
                color={stockColor(selected.stock)}
              />
              <Stat label="SHIPS" value="2–4d" />
            </Box>

            <Typography
              sx={{
                mt: 2.5,
                fontSize: { xs: 13, sm: 14 },
                lineHeight: 1.65,
                color: 'text.secondary',
                maxWidth: 480,
              }}
            >
              {p.description}
            </Typography>

            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                gap: 1.75,
                mt: 3,
                maxWidth: 460,
                alignItems: 'stretch',
              }}
            >
              {actions}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* mobile sticky action bar */}
      <Box
        sx={{
          display: { xs: 'flex', sm: 'none' },
          flex: 'none',
          gap: 1.5,
          p: 2.5,
          pb: 'calc(20px + env(safe-area-inset-bottom))',
          borderTop: '1.5px solid',
          borderColor: 'primary.main',
          position: 'sticky',
          bottom: 0,
          bgcolor: 'background.paper',
        }}
      >
        {actions}
      </Box>
    </Box>
  );
}

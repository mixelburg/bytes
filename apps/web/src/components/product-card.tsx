import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { priceLabel } from '../data/format';
import type { ListItem } from '../data/queries';
import { tapHaptic } from '../haptics';
import { flyToCart, staggerDelay } from '../motion';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleSaved } from '../store/saved-slice';
import { mono } from '../theme';
import { Mono, ProductImage, SquareButton } from './ui';

/** Catalog grid card — image, save toggle, quick-add, title, price, rating.
 *  Shared by the list and saved screens. `index` drives the entrance stagger. */
export default function ProductCard({
  p,
  onAdd,
  index = 0,
}: {
  p: ListItem;
  onAdd?: (p: ListItem) => void;
  index?: number;
}) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const saved = useAppSelector((s) => s.saved.ids.includes(p.id));
  const soldOut = !p.inStock;
  return (
    <Box
      data-flip-id={p.id}
      onClick={() => navigate(`/p/${p.id}`)}
      style={{ animationDelay: staggerDelay(index) }}
      sx={{ cursor: 'pointer', animation: 'mslide .25s ease both' }}
    >
      <Box sx={{ position: 'relative', aspectRatio: '1' }}>
        <ProductImage src={p.image} alt={p.title} />
        {/* save toggle — independent of navigation and quick-add */}
        <SquareButton
          aria-label={
            saved ? `Remove ${p.title} from saved` : `Save ${p.title}`
          }
          aria-pressed={saved}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 32,
            height: 32,
            fontSize: 16,
          }}
          onClick={(e) => {
            e.stopPropagation();
            dispatch(toggleSaved(p.id));
          }}
        >
          {saved ? '♥' : '♡'}
        </SquareButton>
        {soldOut ? (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'scrim',
              display: 'grid',
              placeItems: 'center',
              fontFamily: mono,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.05em',
              animation: 'mfade .25s ease both',
            }}
          >
            SOLD OUT
          </Box>
        ) : (
          onAdd && (
            <SquareButton
              aria-label={`Add ${p.title} to cart`}
              style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                width: 32,
                height: 32,
                fontSize: 19,
              }}
              onClick={(e) => {
                e.stopPropagation();
                // fly the image tile (the button's parent) toward the cart
                if (e.currentTarget.parentElement)
                  flyToCart(e.currentTarget.parentElement);
                tapHaptic();
                onAdd(p);
              }}
            >
              +
            </SquareButton>
          )
        )}
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          mt: 1,
          gap: 0.75,
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.15 }}>
          {p.title}
        </Typography>
        <Box
          sx={{
            fontFamily: mono,
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {priceLabel(p.priceMin, p.priceMax)}
        </Box>
      </Box>
      <Mono sx={{ display: 'block', mt: 0.25, fontSize: 10 }}>
        ★{p.rating.toFixed(1)} · {p.category.toUpperCase()}
      </Mono>
    </Box>
  );
}

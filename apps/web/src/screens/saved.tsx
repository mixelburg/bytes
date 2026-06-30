import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useQueries } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/product-card';
import { CenterState, Mono, ProductImage } from '../components/ui';
import {
  type ListItem,
  type ProductDetail,
  productQueryOptions,
} from '../data/queries';
import { useAppSelector } from '../store/hooks';
import { selectSavedIds } from '../store/saved-slice';

// Map the detail record to the catalog card's shape (priceMin/Max + inStock
// are derived from variants on the list endpoint; recompute them here).
function toListItem(p: ProductDetail): ListItem {
  const prices = p.variants.map((v) => v.price);
  return {
    id: p.id,
    title: p.title,
    category: p.category,
    image: p.image,
    rating: p.rating,
    priceMin: Math.min(...prices),
    priceMax: Math.max(...prices),
    inStock: p.variants.some((v) => v.stock > 0),
  };
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        mt: 1.75,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '20px 16px',
      }}
    >
      {children}
    </Box>
  );
}

export default function SavedScreen() {
  const navigate = useNavigate();
  const ids = useAppSelector(selectSavedIds);

  // ponytail: one GET /products/:id per saved id; fine for a personal saved
  // list. Add a GET /products?ids= batch endpoint if lists grow large.
  const queries = useQueries({
    queries: ids.map((id) => ({ ...productQueryOptions(id), retry: 1 })),
  });

  if (ids.length === 0) {
    return (
      <CenterState
        glyph="♡"
        title="Nothing saved yet"
        body="Tap the heart on a product to keep it here for later."
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

  const isLoading = queries.some((q) => q.isLoading);
  const allFailed = queries.every((q) => q.isError);

  // Every id errored with a non-empty set → treat as a load failure (API down).
  if (allFailed) {
    return (
      <CenterState
        glyph="!"
        title="Couldn’t load saved items"
        body="Something went wrong. Check your connection and try again."
      >
        <Button
          variant="contained"
          sx={{ mt: 2.5, height: 46, px: 3 }}
          onClick={() => {
            for (const q of queries) q.refetch();
          }}
        >
          Retry
        </Button>
      </CenterState>
    );
  }

  // Successful records only; a single 404'd (stale) id is silently skipped.
  const products = queries.flatMap((q) => (q.data ? [toListItem(q.data)] : []));

  return (
    <Box sx={{ px: 2.5, pt: 1.5, pb: 4 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <Typography variant="h3" component="h1">
          Saved
        </Typography>
        <Mono>
          {ids.length} {ids.length === 1 ? 'ITEM' : 'ITEMS'}
        </Mono>
      </Box>

      {isLoading ? (
        <Grid>
          {ids.map((id) => (
            <Box key={id} sx={{ position: 'relative', aspectRatio: '1' }}>
              <ProductImage alt="" />
            </Box>
          ))}
        </Grid>
      ) : (
        <Grid>
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </Grid>
      )}
    </Box>
  );
}

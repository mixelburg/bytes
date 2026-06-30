import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useSnackbar } from 'notistack';
import { useAppDispatch } from '../store/hooks';
import { addItem } from '../store/cart-slice';
import { api } from '../api/client';
import { useCatalog, useCategories, SORTS, type SortKey, type ListItem } from '../data/queries';
import { Mono, ProductImage, CenterState } from '../components/ui';
import ProductCard from '../components/product-card';
import { mono } from '../theme';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function ListScreen() {
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [raw, setRaw] = useState('');
  const search = useDebounced(raw, 250);
  const [category, setCategory] = useState(''); // '' = All
  const [sort, setSort] = useState<SortKey>('newest');
  const [sortEl, setSortEl] = useState<HTMLElement | null>(null);

  const { data, isLoading, isError, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useCatalog({ search, category, sort });
  const { data: categories } = useCategories();

  const items = data?.pages.flatMap((pg) => pg.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const tabs = ['All', ...(categories ?? [])];

  // Quick-add from the grid: the list item has no variant, so fetch the product
  // and add its first in-stock variant.
  const quickAdd = async (p: ListItem) => {
    try {
      const res = await api.products[':id'].$get({ param: { id: String(p.id) } });
      if (!res.ok) throw new Error();
      const product = await res.json();
      const v = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
      if (!v || v.stock <= 0) {
        enqueueSnackbar('Out of stock', { variant: 'warning' });
        return;
      }
      dispatch(
        addItem({
          variantId: v.id,
          productId: product.id,
          title: product.title,
          optionsLabel: v.optionsLabel,
          price: v.price,
          image: v.image || product.image,
          stock: v.stock,
        })
      );
      enqueueSnackbar(`${product.title} added to cart`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Could not add item', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ px: 2.5, pt: 1.5, pb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Typography variant="h3" component="h1">
          Market
        </Typography>
        {total > 0 && <Mono>{total.toLocaleString('en-US')} ITEMS</Mono>}
      </Box>

      {/* search */}
      <Box
        sx={{ mt: 1.75, height: 46, border: '1.5px solid', borderColor: 'primary.main', display: 'flex', alignItems: 'center', gap: 1, px: 1.5 }}
      >
        <Box sx={{ fontSize: 16 }}>⌕</Box>
        <InputBase
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Search products"
          inputProps={{ 'aria-label': 'Search products' }}
          sx={{ flex: 1, fontWeight: 500, fontSize: 14 }}
        />
        {raw && (
          <Box role="button" aria-label="Clear search" onClick={() => setRaw('')} sx={{ cursor: 'pointer', fontSize: 14, color: 'text.disabled' }}>
            ✕
          </Box>
        )}
      </Box>

      {/* category tabs */}
      <Box
        sx={{ mt: 2, display: 'flex', gap: 2.25, overflowX: 'auto', borderBottom: 1, borderColor: 'divider', '&::-webkit-scrollbar': { display: 'none' } }}
      >
        {tabs.map((c) => {
          const value = c === 'All' ? '' : c;
          const on = value === category;
          return (
            <Box
              key={c}
              role="button"
              onClick={() => setCategory(value)}
              sx={{
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: mono,
                fontSize: 11,
                letterSpacing: '0.03em',
                pb: 1.25,
                mb: '-1px',
                fontWeight: on ? 600 : 400,
                color: on ? 'text.primary' : 'text.disabled',
                borderBottom: on ? '1.5px solid' : '1.5px solid transparent',
              }}
            >
              {c.toUpperCase()}
            </Box>
          );
        })}
      </Box>

      {/* result count + sort */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5, alignItems: 'center' }}>
        <Mono>{total.toLocaleString('en-US')} {total === 1 ? 'RESULT' : 'RESULTS'}</Mono>
        <Mono role="button" onClick={(e) => setSortEl(e.currentTarget)} sx={{ color: 'text.primary', cursor: 'pointer' }}>
          {SORTS[sort].toUpperCase()} ↕
        </Mono>
      </Box>
      <Menu anchorEl={sortEl} open={!!sortEl} onClose={() => setSortEl(null)}>
        {(Object.keys(SORTS) as SortKey[]).map((k) => (
          <MenuItem key={k} selected={k === sort} onClick={() => { setSort(k); setSortEl(null); }} sx={{ fontSize: 14 }}>
            {SORTS[k]}
          </MenuItem>
        ))}
      </Menu>

      {/* states */}
      {isError ? (
        <CenterState glyph="!" title="Couldn’t load products" body="Something went wrong. Check your connection and try again.">
          <Button variant="contained" sx={{ mt: 2.5, height: 46, px: 3 }} onClick={() => refetch()}>
            Retry
          </Button>
        </CenterState>
      ) : isLoading ? (
        <Grid>
          {Array.from({ length: 8 }).map((_, i) => (
            <Box key={i} sx={{ position: 'relative', aspectRatio: '1' }}>
              <ProductImage alt="" />
            </Box>
          ))}
        </Grid>
      ) : total === 0 ? (
        <CenterState glyph="⌕" title="No matches" body={`Nothing for “${search}”. Try another term or clear your filters.`}>
          <Button variant="contained" sx={{ mt: 2.5, height: 46, px: 3 }} onClick={() => { setRaw(''); setCategory(''); }}>
            Clear filters
          </Button>
        </CenterState>
      ) : (
        <>
          <Grid>
            {items.map((p) => (
              <ProductCard key={p.id} p={p} onAdd={quickAdd} />
            ))}
          </Grid>
          {hasNextPage ? (
            <Button variant="outlined" fullWidth sx={{ mt: 2.5, height: 46 }} disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
              {isFetchingNextPage ? 'Loading…' : `Load more — ${(total - items.length).toLocaleString('en-US')} more`}
            </Button>
          ) : (
            <Mono sx={{ display: 'block', textAlign: 'center', mt: 2.5, fontSize: 10 }}>
              — END · {total.toLocaleString('en-US')} ITEMS —
            </Mono>
          )}
        </>
      )}
    </Box>
  );
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

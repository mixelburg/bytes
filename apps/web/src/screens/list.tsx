import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import ProductCard from '../components/product-card';
import { CenterState, Mono, ProductImage } from '../components/ui';
import {
  type ListItem,
  SORTS,
  type SortKey,
  useCatalog,
  useCategories,
} from '../data/queries';
import { usePullToRefresh } from '../motion';
import { addItem } from '../store/cart-slice';
import { useAppDispatch } from '../store/hooks';
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

  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useCatalog({ search, category, sort });
  const { data: categories } = useCategories();

  const items = data?.pages.flatMap((pg) => pg.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const tabs = ['All', ...(categories ?? [])];

  const { pull, refreshing } = usePullToRefresh(() => refetch());

  // Windowed grid: chunk the flat item list into rows of `columns`, then
  // virtualize the rows so only on-screen cards are mounted no matter how many
  // pages have been loaded. `columns` tracks the responsive auto-fill width.
  const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);
  const [columns, setColumns] = useState(2);
  useEffect(() => {
    if (!gridEl) return;
    // matches the CSS cells: minmax(150px, …) with a 16px column gap
    const measure = () =>
      setColumns(Math.max(1, Math.floor((gridEl.clientWidth + 16) / 166)));
    measure();
    if (typeof ResizeObserver === 'undefined') return; // SSR / jsdom
    const ro = new ResizeObserver(measure);
    ro.observe(gridEl);
    return () => ro.disconnect();
  }, [gridEl]);

  const rows: ListItem[][] = [];
  for (let i = 0; i < items.length; i += columns)
    rows.push(items.slice(i, i + columns));

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 240, // card square + label; remeasured on mount
    overscan: 4,
    scrollMargin: gridEl?.offsetTop ?? 0,
  });
  const virtualRows = virtualizer.getVirtualItems();

  // Prefetch the next page as the last row scrolls into view.
  useEffect(() => {
    const last = virtualRows.at(-1);
    if (
      last &&
      last.index >= rows.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    )
      fetchNextPage();
  }, [
    virtualRows,
    rows.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  // Quick-add from the grid: the list item has no variant, so fetch the product
  // and add its first in-stock variant.
  const quickAdd = async (p: ListItem) => {
    try {
      const res = await api.products[':id'].$get({
        param: { id: String(p.id) },
      });
      if (!res.ok) throw new Error();
      const product = await res.json();
      const v =
        product.variants.find((v) => v.stock > 0) ?? product.variants[0];
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
        }),
      );
    } catch {
      enqueueSnackbar('Could not add item', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ px: 2.5, pt: 1.5, pb: 4 }}>
      {/* pull-to-refresh affordance (mobile) */}
      {(pull > 0 || refreshing) && (
        <Box
          sx={{
            height: pull,
            mb: refreshing ? 1 : 0,
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: '0.08em',
            color: 'text.disabled',
          }}
        >
          {refreshing ? 'REFRESHING…' : pull >= 70 ? 'RELEASE ↑' : 'PULL ↓'}
        </Box>
      )}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <Typography variant="h3" component="h1">
          Market
        </Typography>
        {total > 0 && <Mono>{total.toLocaleString('en-US')} ITEMS</Mono>}
      </Box>

      {/* search */}
      <Box
        sx={{
          mt: 1.75,
          height: 46,
          border: '1.5px solid',
          borderColor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
        }}
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
          <Box
            role="button"
            aria-label="Clear search"
            onClick={() => setRaw('')}
            sx={{ cursor: 'pointer', fontSize: 14, color: 'text.disabled' }}
          >
            ✕
          </Box>
        )}
      </Box>

      {/* category tabs */}
      <Box
        sx={{
          mt: 2,
          display: 'flex',
          gap: 2.25,
          overflowX: 'auto',
          borderBottom: 1,
          borderColor: 'divider',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mt: 1.5,
          alignItems: 'center',
        }}
      >
        <Mono>
          {total.toLocaleString('en-US')} {total === 1 ? 'RESULT' : 'RESULTS'}
        </Mono>
        <Mono
          role="button"
          onClick={(e) => setSortEl(e.currentTarget)}
          sx={{ color: 'text.primary', cursor: 'pointer' }}
        >
          {SORTS[sort].toUpperCase()} ↕
        </Mono>
      </Box>
      <Menu anchorEl={sortEl} open={!!sortEl} onClose={() => setSortEl(null)}>
        {(Object.keys(SORTS) as SortKey[]).map((k) => (
          <MenuItem
            key={k}
            selected={k === sort}
            onClick={() => {
              setSort(k);
              setSortEl(null);
            }}
            sx={{ fontSize: 14 }}
          >
            {SORTS[k]}
          </MenuItem>
        ))}
      </Menu>

      {/* states */}
      {isError ? (
        <CenterState
          glyph="!"
          title="Couldn’t load products"
          body="Something went wrong. Check your connection and try again."
        >
          <Button
            variant="contained"
            sx={{ mt: 2.5, height: 46, px: 3 }}
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </CenterState>
      ) : isLoading ? (
        <Grid>
          {Array.from({ length: 8 }).map((_, i) => (
            <Box
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, no stable id
              key={i}
              sx={{
                position: 'relative',
                aspectRatio: '1',
                animation: 'mpulse 1.5s ease-in-out infinite',
              }}
            >
              <ProductImage alt="" />
            </Box>
          ))}
        </Grid>
      ) : total === 0 ? (
        <CenterState
          glyph="⌕"
          title="No matches"
          body={`Nothing for “${search}”. Try another term or clear your filters.`}
        >
          <Button
            variant="contained"
            sx={{ mt: 2.5, height: 46, px: 3 }}
            onClick={() => {
              setRaw('');
              setCategory('');
            }}
          >
            Clear filters
          </Button>
        </CenterState>
      ) : (
        <>
          <Box
            ref={setGridEl}
            sx={{ mt: 1.75, position: 'relative' }}
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualRows.map((vr) => (
              <Box
                key={vr.key}
                data-index={vr.index}
                ref={virtualizer.measureElement}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  gap: '0 16px',
                  pb: '20px',
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${vr.start - virtualizer.options.scrollMargin}px)`,
                }}
              >
                {rows[vr.index].map((p, j) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    index={vr.index * columns + j}
                    onAdd={quickAdd}
                  />
                ))}
              </Box>
            ))}
          </Box>
          {hasNextPage ? (
            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 2.5, height: 46 }}
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              {isFetchingNextPage
                ? 'Loading…'
                : `Load more — ${(total - items.length).toLocaleString('en-US')} more`}
            </Button>
          ) : (
            <Mono
              sx={{
                display: 'block',
                textAlign: 'center',
                mt: 2.5,
                fontSize: 10,
              }}
            >
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

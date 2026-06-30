import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { CenterState, Mono } from '../components/ui';
import { money } from '../data/format';
import { type OrderSummary, useOrders } from '../data/queries';
import { staggerDelay } from '../motion';
import { mono } from '../theme';

const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

function OrderRow({
  o,
  onOpen,
  index = 0,
}: {
  o: OrderSummary;
  onOpen: () => void;
  index?: number;
}) {
  return (
    <Box
      role="button"
      onClick={onOpen}
      style={{ animationDelay: staggerDelay(index) }}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 1.6,
        borderBottom: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        animation: 'mslide .25s ease both',
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Box>
        <Mono sx={{ fontSize: 12 }}>#{o.id.slice(-8)}</Mono>
        <Box sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25 }}>
          {date(o.createdAt)} · {o.count} {o.count === 1 ? 'item' : 'items'}
        </Box>
      </Box>
      <Box sx={{ fontFamily: mono, fontWeight: 600, fontSize: 13 }}>
        {money(o.total)}
      </Box>
    </Box>
  );
}

export default function OrdersScreen() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useOrders();

  if (isLoading) {
    return (
      <Box
        sx={{ flex: 1, display: 'grid', placeItems: 'center', minHeight: 240 }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <CenterState
        glyph="!"
        title="Couldn’t load orders"
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
    );
  }

  if (!data || data.length === 0) {
    return (
      <CenterState
        glyph="✦"
        title="No orders yet"
        body="Your placed orders will show up here, ready to track."
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
          Orders
        </Typography>
        <Mono>
          {data.length} {data.length === 1 ? 'ORDER' : 'ORDERS'}
        </Mono>
      </Box>

      <Box
        sx={{ mt: 1.75, border: '1.5px solid', borderColor: 'primary.main' }}
      >
        {data.map((o, i) => (
          <OrderRow
            key={o.id}
            o={o}
            index={i}
            onOpen={() => navigate(`/track/${o.id}`)}
          />
        ))}
      </Box>
    </Box>
  );
}

import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import { useOrder, NotFoundError } from '../data/queries';
import { CenterState, SectionLabel, Mono } from '../components/ui';
import { RouteSchematic } from '../components/route-schematic';
import { money } from '../data/format';
import { mono } from '../theme';

const STATUS_COPY: Record<string, string> = {
  processing: 'Preparing your order',
  in_transit: 'On the move',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function TrackScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useOrder(id);

  if (error) {
    const notFound = error instanceof NotFoundError;
    return (
      <CenterState
        glyph={notFound ? '∅' : '!'}
        title={notFound ? 'Order not found' : 'Couldn’t load tracking'}
        body={
          notFound
            ? 'We couldn’t find that order. Check the link or browse the catalog.'
            : 'Something went wrong fetching the latest status.'
        }
      >
        <Button
          variant="contained"
          sx={{ mt: 2.5, height: 46, px: 3 }}
          onClick={() => (notFound ? navigate('/') : refetch())}
        >
          {notFound ? 'Back to products' : 'Try again'}
        </Button>
      </CenterState>
    );
  }

  if (isLoading || !data) {
    return (
      <Box sx={{ p: 2.5, maxWidth: 560, width: '100%', mx: 'auto' }}>
        <Skeleton width="50%" height={40} />
        <Skeleton width="70%" />
        <Skeleton variant="rectangular" height={320} sx={{ mt: 2, bgcolor: 'tile' }} />
      </Box>
    );
  }

  const delivered = data.status === 'delivered';
  const passed = data.stops.filter((s) => s.state === 'done').length;
  const lastIndex = data.stops.length - 1;
  const passedLabel = delivered
    ? `${data.stops.length} of ${data.stops.length} stops passed`
    : `${passed} of ${lastIndex} stops passed`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Box sx={{ px: 2.5, pt: 1.5 }}>
        <Mono role="button" onClick={() => navigate('/')} sx={{ cursor: 'pointer', color: 'text.secondary' }}>
          ‹ CONTINUE SHOPPING
        </Mono>
      </Box>

      <Box sx={{ flex: 1, px: 2.5, py: 2, maxWidth: 560, width: '100%', mx: 'auto' }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: 24 }}>
          {STATUS_COPY[data.status] ?? 'Tracking order'}
        </Typography>

        {/* ETA banner */}
        <Box
          sx={{
            mt: 2,
            border: '1.5px solid',
            borderColor: 'primary.main',
            p: 1.75,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <SectionLabel>{delivered ? 'DELIVERED' : 'ESTIMATED ARRIVAL'}</SectionLabel>
            <Box sx={{ fontFamily: mono, fontSize: 22, fontWeight: 600, mt: 0.25 }}>{fmtTime(data.eta)}</Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <SectionLabel>PROGRESS</SectionLabel>
            <Box sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>{passedLabel}</Box>
          </Box>
        </Box>

        <Box sx={{ mt: 2.5 }}><SectionLabel>ROUTE</SectionLabel></Box>
        <Box sx={{ mt: 1, border: '1px solid', borderColor: 'divider', p: 1.5 }}>
          <RouteSchematic stops={data.stops} />
        </Box>

        <Box sx={{ mt: 2.5 }}><SectionLabel>DELIVER TO</SectionLabel></Box>
        <Box sx={{ mt: 1, border: '1.5px solid', borderColor: 'primary.main', p: 1.75 }}>
          <Box sx={{ fontSize: 13, fontWeight: 600 }}>{data.address.recipient ?? 'Recipient'}</Box>
          <Box sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
            {[data.address.line1, [data.address.city, data.address.postal].filter(Boolean).join(' ')]
              .filter(Boolean)
              .join(' · ')}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'text.secondary', mt: 2 }}>
          <Box component="span" sx={{ fontFamily: mono }}>ORDER {data.id}</Box>
          <Box component="span" sx={{ fontFamily: mono }}>{money(data.total)}</Box>
        </Box>
      </Box>
    </Box>
  );
}

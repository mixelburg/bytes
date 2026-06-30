import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { resetOrder } from '../store/order-slice';
import { money } from '../data/format';
import { mono } from '../theme';

export default function ConfirmScreen() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const order = useAppSelector((s) => s.order.last);

  // Direct hit without an order → nothing to confirm.
  useEffect(() => {
    if (!order) navigate('/', { replace: true });
  }, [order, navigate]);

  if (!order) return null;

  const done = () => {
    dispatch(resetOrder());
    navigate('/');
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 4,
        py: 6,
        animation: 'mpop .3s ease both',
      }}
    >
      <Box
        sx={{
          width: 78,
          height: 78,
          border: '2px solid',
          borderColor: 'primary.main',
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          fontSize: 34,
        }}
      >
        ✓
      </Box>
      <Typography component="h1" sx={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.02em', mt: 2.75 }}>
        Order placed
      </Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 1, maxWidth: 240, lineHeight: 1.5 }}>
        Thanks! A confirmation is on its way. You’ll get tracking once it ships.
      </Typography>

      <Box sx={{ mt: 3, width: '100%', maxWidth: 360, border: '1.5px solid', borderColor: 'primary.main' }}>
        {[
          ['Order no.', order.id],
          ['Items', String(order.count)],
          ['Total paid', money(order.total)],
        ].map(([k, v], i, arr) => (
          <Box
            key={k}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              p: 1.6,
              borderBottom: i < arr.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
              fontSize: 12,
            }}
          >
            <Box sx={{ color: 'text.disabled' }}>{k}</Box>
            <Box sx={{ fontFamily: mono, fontWeight: k === 'Total paid' ? 600 : 400 }}>{v}</Box>
          </Box>
        ))}
      </Box>

      <Button
        variant="contained"
        onClick={() => navigate(`/track/${order.id}`)}
        sx={{ mt: 2.75, height: 48, px: 3, maxWidth: 360, width: '100%' }}
      >
        Track order
      </Button>
      <Button variant="outlined" onClick={done} sx={{ mt: 1.5, height: 48, px: 3, maxWidth: 360, width: '100%' }}>
        Continue shopping
      </Button>
    </Box>
  );
}

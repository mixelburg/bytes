import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import type { TrackedOrder } from '../data/queries';
import { mono } from '../theme';

type Stop = TrackedOrder['stops'][number];

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Vertical route: warehouse → pass-points → address. The connecting line fills
// up to the courier (current stop); each node's treatment encodes its state.
export function RouteSchematic({ stops }: { stops: Stop[] }) {
  const theme = useTheme();
  const ink = theme.vars!.palette.primary.main;
  const faint = theme.vars!.palette.faint;
  const currentIndex = Math.max(
    0,
    stops.findIndex((s) => s.state === 'current'),
  );
  const lastIndex = stops.length - 1;
  const delivered = stops.every((s) => s.state === 'done');
  // Filled track stops at the courier (or the end once delivered).
  const filledRatio = delivered ? 1 : currentIndex / lastIndex;

  return (
    <Box sx={{ position: 'relative', pl: 0.5 }}>
      {/* track */}
      <Box
        sx={{
          position: 'absolute',
          left: 11,
          top: 12,
          bottom: 12,
          width: 0,
          borderLeft: `1.5px solid ${faint}`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          left: 11,
          top: 12,
          height: `calc((100% - 24px) * ${filledRatio})`,
          width: 0,
          borderLeft: `1.5px solid ${ink}`,
          transition: 'height .5s ease',
        }}
      />

      {stops.map((stop, i) => {
        const isCurrent = !delivered && i === currentIndex;
        const isDone = stop.state === 'done';
        const isDest = i === lastIndex;
        return (
          <Box
            key={stop.label}
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.75,
              py: 1.5,
            }}
          >
            {/* node */}
            <Box
              aria-hidden
              sx={{
                flex: 'none',
                mt: 0.25,
                width: 24,
                height: 24,
                display: 'grid',
                placeItems: 'center',
                border: `1.5px solid ${isDone || isCurrent ? ink : faint}`,
                bgcolor: isCurrent
                  ? 'background.paper'
                  : isDone
                    ? 'primary.main'
                    : 'background.paper',
                color: isDone ? 'primary.contrastText' : 'text.primary',
                borderRadius: isDest ? '50%' : 0,
                fontSize: 12,
                lineHeight: 1,
                ...(isCurrent && {
                  animation: 'mpop .3s ease both',
                  boxShadow: `0 0 0 4px ${theme.vars!.palette.background.paper}`,
                }),
              }}
            >
              {isCurrent ? '◉' : isDone ? '✓' : ''}
            </Box>

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box>
                <Box
                  sx={{
                    fontSize: 13,
                    fontWeight: isCurrent ? 700 : 600,
                    color:
                      isDone || isCurrent ? 'text.primary' : 'text.secondary',
                  }}
                >
                  {stop.label}
                </Box>
                {isCurrent && !delivered && (
                  <Box
                    sx={{
                      fontFamily: mono,
                      fontSize: 10,
                      letterSpacing: '0.06em',
                      color: 'text.disabled',
                      mt: 0.25,
                    }}
                  >
                    COURIER HERE
                  </Box>
                )}
              </Box>
              <Box
                sx={{
                  fontFamily: mono,
                  fontSize: 11,
                  color: 'text.disabled',
                  whiteSpace: 'nowrap',
                }}
              >
                {isDone ? fmtTime(stop.etaAt) : `~${fmtTime(stop.etaAt)}`}
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

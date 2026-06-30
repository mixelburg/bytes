import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import { useState } from 'react';
import { mono } from '../theme';

export { mono };

/** Real product image over the striped tile; falls back to stripes on error
 *  or while missing. Fills its (relatively-positioned, sized) parent. */
export function ProductImage({ src, alt }: { src?: string; alt: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <Striped sx={{ position: 'absolute', inset: 0 }}>
      {src && !broken && (
        <Box
          component="img"
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setBroken(true)}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      )}
    </Striped>
  );
}

/** Monospace label — prices, counts, codes, section headers. */
export const Mono = styled('span')(({ theme }) => ({
  fontFamily: mono,
  fontSize: 11,
  letterSpacing: '0.03em',
  color: theme.vars!.palette.text.disabled,
}));

/** Diagonal-striped image placeholder. Size it via the parent / sx. */
export const Striped = styled('div')(({ theme }) => ({
  background: `repeating-linear-gradient(45deg, ${theme.vars!.palette.stripe1} 0 8px, ${theme.vars!.palette.stripe2} 8px 16px), ${theme.vars!.palette.tile}`,
}));

/** Bordered square button — the one structural button shape (＋, ‹, ♡). */
export const SquareButton = styled('button')(({ theme }) => ({
  border: `1.5px solid ${theme.vars!.palette.primary.main}`,
  background: theme.vars!.palette.background.paper,
  color: theme.vars!.palette.text.primary,
  fontFamily: mono,
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  lineHeight: 1,
  transition: 'background .15s, color .15s',
  '&:hover:not(:disabled)': {
    background: theme.vars!.palette.primary.main,
    color: theme.vars!.palette.primary.contrastText,
  },
  '&:disabled': { opacity: 0.4, cursor: 'default' },
}));

/** Mono section label, e.g. SUMMARY / PAYMENT / DETAILS. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        fontFamily: mono,
        fontSize: 10,
        letterSpacing: '0.08em',
        color: 'text.disabled',
      }}
    >
      {children}
    </Box>
  );
}

/** − qty + stepper, bordered, mono. Controlled. */
export function QtyStepper({
  qty,
  onDec,
  onInc,
  canInc = true,
  cell = 38,
  height = 50,
}: {
  qty: number;
  onDec: () => void;
  onInc: () => void;
  canInc?: boolean;
  cell?: number;
  height?: number;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        border: '1.5px solid',
        borderColor: 'primary.main',
        fontFamily: mono,
        color: 'text.primary',
      }}
    >
      <Box
        role="button"
        aria-label="Decrease quantity"
        onClick={onDec}
        sx={{
          cursor: 'pointer',
          width: cell,
          height,
          display: 'grid',
          placeItems: 'center',
          fontSize: 18,
        }}
      >
        −
      </Box>
      <Box
        sx={{
          minWidth: 28,
          textAlign: 'center',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        {qty}
      </Box>
      <Box
        role="button"
        aria-label="Increase quantity"
        onClick={canInc ? onInc : undefined}
        sx={{
          cursor: canInc ? 'pointer' : 'default',
          width: cell,
          height,
          display: 'grid',
          placeItems: 'center',
          fontSize: 18,
          color: canInc ? 'text.primary' : 'text.disabled',
        }}
      >
        +
      </Box>
    </Box>
  );
}

/** Full-bleed centered state (empty / error / not-found) with an action. */
export function CenterState({
  glyph,
  title,
  body,
  children,
}: {
  glyph: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 8,
        px: 4,
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          border: '1.5px solid',
          borderColor: 'primary.main',
          display: 'grid',
          placeItems: 'center',
          fontSize: 30,
        }}
      >
        {glyph}
      </Box>
      <Box sx={{ fontSize: 18, fontWeight: 700, mt: 2.5 }}>{title}</Box>
      <Box
        sx={{
          fontSize: 13,
          color: 'text.secondary',
          mt: 1,
          maxWidth: 240,
          lineHeight: 1.5,
        }}
      >
        {body}
      </Box>
      {children}
    </Box>
  );
}

import { createTheme } from '@mui/material/styles';

// "Mono Editorial" — ported from the approved Claude Design prototype.
// Two typefaces, strict roles: Archivo for human text, Spline Sans Mono for
// every label/number/code. Squared corners, hard 1.5px ink borders, no accent.
export const mono = "'Spline Sans Mono', ui-monospace, monospace";
const sans = "'Archivo', system-ui, -apple-system, sans-serif";

// Custom palette slots carrying the prototype's tokens. Augmented so they are
// fully typed on theme.palette AND theme.vars (no `any`).
declare module '@mui/material/styles' {
  interface Palette {
    canvas: string;
    tile: string;
    faint: string;
    stripe1: string;
    stripe2: string;
    scrim: string;
    errbg: string;
    errtext: string;
  }
  interface PaletteOptions {
    canvas?: string;
    tile?: string;
    faint?: string;
    stripe1?: string;
    stripe2?: string;
    scrim?: string;
    errbg?: string;
    errtext?: string;
  }
}

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  shape: { borderRadius: 0 }, // squared, never rounded
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#0c0c0c', contrastText: '#ffffff' }, // ink
        text: { primary: '#0c0c0c', secondary: '#666666', disabled: '#a6a6a6' },
        background: { default: '#efece6', paper: '#ffffff' }, // canvas / bg
        divider: '#ededed',
        canvas: '#efece6',
        tile: '#ebe9e2',
        faint: '#a6a6a6',
        stripe1: 'rgba(0,0,0,.05)',
        stripe2: 'rgba(0,0,0,.02)',
        scrim: 'rgba(255,255,255,.78)',
        errbg: '#fdf0ee',
        errtext: '#d0503f',
      },
    },
    dark: {
      palette: {
        primary: { main: '#f3f3f4', contrastText: '#151517' }, // ink (inverted)
        text: { primary: '#f3f3f4', secondary: '#a2a2aa', disabled: '#67676f' },
        background: { default: '#0b0b0c', paper: '#151517' },
        divider: '#27272b',
        canvas: '#0b0b0c',
        tile: '#232327',
        faint: '#67676f',
        stripe1: 'rgba(255,255,255,.07)',
        stripe2: 'rgba(255,255,255,.03)',
        scrim: 'rgba(18,18,20,.8)',
        errbg: '#2a1614',
        errtext: '#d0503f',
      },
    },
  },
  typography: {
    fontFamily: sans,
    h1: { fontWeight: 800, letterSpacing: '-0.03em' },
    h2: { fontWeight: 800, letterSpacing: '-0.03em' },
    h3: { fontWeight: 800, letterSpacing: '-0.02em' },
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 700 },
    button: { fontFamily: mono, fontWeight: 600, letterSpacing: '0.03em' },
    overline: { fontFamily: mono, letterSpacing: '0.12em', fontSize: 11 },
  },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: 'uppercase', boxShadow: 'none' },
        outlined: ({ theme }) => ({
          border: `1.5px solid ${theme.vars.palette.primary.main}`,
          '&:hover': {
            border: `1.5px solid ${theme.vars.palette.primary.main}`,
            backgroundColor: theme.vars.palette.action.hover,
          },
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.vars.palette.primary.main,
            borderWidth: 1.5,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.vars.palette.primary.main,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.vars.palette.primary.main,
            borderWidth: 1.5,
          },
        }),
      },
    },
  },
});

export default theme;

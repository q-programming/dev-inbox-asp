import { createTheme, type PaletteMode } from '@mui/material';

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

// ── TypeScript palette augmentation ─────────────────────────────────────────
declare module '@mui/material/styles' {
  interface Palette {
    hero: { gradientBg: string; badgeBg: string };
    note: { border: string; labelText: string };
  }

  interface PaletteOptions {
    hero?: { gradientBg: string; badgeBg: string };
    note?: { border: string; labelText: string };
  }
}

// ── Brand tokens ─────────────────────────────────────────────────────────────
const PRIMARY = '#2C5AA0';
const SECONDARY = '#0EA5E9';
const ERROR = '#ba1a1a';

export function buildTheme(mode: PaletteMode) {
  const light = mode === Theme.LIGHT;

  return createTheme({
    palette: {
      mode,
      primary: { main: PRIMARY },
      secondary: { main: SECONDARY },
      error: { main: ERROR },
      warning: { main: '#f59e0b', dark: '#b45309' },
      background: {
        default: light ? '#e2e2e8' : '#1a1c20',
        paper: light ? '#f9f9ff' : '#2f3035',
      },
      text: {
        primary: light ? '#1a1c20' : '#e8e8ef',
        secondary: light ? '#434751' : '#9a9ca5',
      },
      divider: light ? '#c3c6d2' : '#3a3c42',
      // Custom tokens
      hero: {
        gradientBg: light
          ? 'linear-gradient(160deg, #eef0fb 0%, #dde3f5 60%, #d4dcf0 100%)'
          : 'linear-gradient(160deg, #1e2130 0%, #1a1c28 100%)',
        badgeBg: light ? '#dde3f5' : '#2a3050',
      },
      note: {
        border: '#f59e0b',
        labelText: '#b45309',
      },
    },
    typography: {
      fontFamily: '"Inter", system-ui, sans-serif',
      // Responsive headline via clamp — eliminates per-component font-size sx
      h1: {
        fontWeight: 900,
        fontSize: 'clamp(2.75rem, 5.5vw, 4.5rem)',
        lineHeight: 1.05,
      },
      h2: {
        fontWeight: 800,
        fontSize: 'clamp(2rem, 4vw, 3rem)',
        lineHeight: 1.1,
      },
      h6: { fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 },
      h4: { fontWeight: 700, lineHeight: 1.3 },
      body1: { lineHeight: 1.7 },
      button: { textTransform: 'none', fontWeight: 600 },
      // JetBrains Mono for technical/code contexts only
      overline: {
        fontFamily: '"JetBrains Mono", monospace',
        fontWeight: 700,
        fontSize: '0.7rem',
        letterSpacing: '0.08em',
        lineHeight: 1,
      },
    },
    shape: { borderRadius: 4 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // Push notistack's bottom-right container above the footer.
          // Footer height: py:2.5 (40px) + border (1px) + 8px gap = ~56px → round to 64px.
          '.notistack-SnackbarContainer': {
            bottom: '66px !important',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiButton: { defaultProps: { disableElevation: true } },
    },
    cssVariables: false,
  });
}

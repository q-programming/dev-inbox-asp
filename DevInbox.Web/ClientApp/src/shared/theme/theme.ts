import { Theme } from '@api';
import { alpha, createTheme, type PaletteMode } from '@mui/material';

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
const PRIMARY_LIGHT = '#2C5AA0';
/**
 * Dark-mode primary: slightly lighter than the brand blue so it remains
 * visible on dark surfaces while still providing enough contrast for white
 * button text (luminance ~0.20 → white contrast ≈ 4.6:1, passes WCAG AA).
 */
const PRIMARY_DARK = '#3A6DBF';
const PRIMARY_LIGHT_VARIANT = '#5B8DD9';
const PRIMARY_DARK_VARIANT = '#7BAFD4';
const SECONDARY = '#0EA5E9';
const ERROR = '#ba1a1a';
const WARNING = '#f59e0b';
const WARNING_DARK = '#b45309';

// ── Background tokens ─────────────────────────────────────────────────────────
const BG_DEFAULT_LIGHT = '#e2e2e8';
const BG_DEFAULT_DARK = '#1a1c20';
const BG_PAPER_LIGHT = '#f9f9ff';
const BG_PAPER_DARK = '#2f3035';

// ── Text tokens ───────────────────────────────────────────────────────────────
const TEXT_PRIMARY_LIGHT = '#1a1c20';
const TEXT_PRIMARY_DARK = '#e8e8ef';
const TEXT_SECONDARY_LIGHT = '#434751';
const TEXT_SECONDARY_DARK = '#9a9ca5';

// ── Divider tokens ────────────────────────────────────────────────────────────
const DIVIDER_LIGHT = '#c3c6d2';
const DIVIDER_DARK = '#3a3c42';

/** Default UI font size in px. Matches the design system's body-md spec. */
export const DEFAULT_FONT_SIZE = 14;
/** Minimum and maximum font size values exposed by the settings slider. */
export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 18;

/**
 * Minimal colour tokens used for theme preview cards in Settings.
 * Kept in sync with the palette defined in {@link buildTheme} so the preview
 * always matches the real theme without running the full MUI theme factory.
 */
export const THEME_PREVIEW_TOKENS = {
  [Theme.Light]: {
    bg: BG_DEFAULT_LIGHT,
    paper: BG_PAPER_LIGHT,
    primary: PRIMARY_LIGHT,
    divider: DIVIDER_LIGHT,
  },
  [Theme.Dark]: {
    bg: BG_DEFAULT_DARK,
    paper: BG_PAPER_DARK,
    primary: PRIMARY_DARK,
    divider: DIVIDER_DARK,
  },
} as const;

export function buildTheme(mode: PaletteMode, fontSize: number = DEFAULT_FONT_SIZE) {
  const light = mode === Theme.Light;
  // MUI's `typography.fontSize` is the rem base (in px). Scaling it shifts all
  // rem-based sizes proportionally — headlines, body copy, captions, buttons.
  const htmlFontSize = 16; // browser default — keep fixed
  return createTheme({
    palette: {
      mode,
      primary: {
        main: light ? PRIMARY_LIGHT : PRIMARY_DARK,
        // Explicit light variant used for links/icons on dark backgrounds.
        light: light ? PRIMARY_LIGHT_VARIANT : PRIMARY_DARK_VARIANT,
      },
      secondary: { main: SECONDARY },
      error: { main: ERROR },
      warning: { main: WARNING, dark: WARNING_DARK },
      background: {
        default: light ? BG_DEFAULT_LIGHT : BG_DEFAULT_DARK,
        paper: light ? BG_PAPER_LIGHT : BG_PAPER_DARK,
      },
      text: {
        primary: light ? TEXT_PRIMARY_LIGHT : TEXT_PRIMARY_DARK,
        secondary: light ? TEXT_SECONDARY_LIGHT : TEXT_SECONDARY_DARK,
      },
      divider: light ? DIVIDER_LIGHT : DIVIDER_DARK,
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
      fontSize: fontSize,
      htmlFontSize,
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
          '.notistack-SnackbarContainer': {
            bottom: '66px !important',
          },
          '.notistack-MuiContent-info': {
            backgroundColor: `${light ? BG_PAPER_LIGHT : BG_PAPER_DARK} !important`,
            color: `${light ? TEXT_PRIMARY_LIGHT : TEXT_PRIMARY_DARK} !important`,
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          // In dark mode links use the explicit light variant so they are
          // readable on dark surfaces without affecting button colours.
          root: light ? {} : { color: PRIMARY_DARK_VARIANT, '&:hover': { color: '#9EC5E0' } },
        },
      },
      MuiAppBar: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            height: 22,
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
          },
          label: { paddingLeft: 8, paddingRight: 8 },
          colorDefault: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'light' ? '#e4e6ef' : '#3a3c46',
            color: theme.palette.text.secondary,
          }),
          colorSuccess: ({ theme }) => ({
            backgroundColor: alpha(theme.palette.success.main, theme.palette.mode === 'light' ? 0.15 : 0.28),
            color: theme.palette.mode === 'light' ? theme.palette.success.dark : theme.palette.success.light,
          }),
          colorInfo: ({ theme }) => ({
            backgroundColor: alpha(theme.palette.info.main, theme.palette.mode === 'light' ? 0.15 : 0.28),
            color: theme.palette.mode === 'light' ? theme.palette.info.dark : theme.palette.info.light,
          }),
          colorWarning: ({ theme }) => ({
            backgroundColor: alpha(theme.palette.warning.main, theme.palette.mode === 'light' ? 0.18 : 0.3),
            color: theme.palette.mode === 'light' ? WARNING_DARK : theme.palette.warning.light,
          }),
          colorError: ({ theme }) => ({
            backgroundColor: alpha(theme.palette.error.main, theme.palette.mode === 'light' ? 0.15 : 0.28),
            color: theme.palette.mode === 'light' ? theme.palette.error.dark : theme.palette.error.light,
          }),
          colorSecondary: ({ theme }) => ({
            backgroundColor: alpha(theme.palette.secondary.main, theme.palette.mode === 'light' ? 0.15 : 0.28),
            color: theme.palette.mode === 'light' ? theme.palette.secondary.dark : theme.palette.secondary.light,
          }),
        },
      },
    },
    cssVariables: false,
  });
}

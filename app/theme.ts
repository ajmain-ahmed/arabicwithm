// app/theme.ts — single source of truth for the ArabicWithM design system.
// Exposes both a MUI theme and CSS custom properties (see globals.css).

import { createTheme, responsiveFontSizes } from "@mui/material/styles";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

export const awmTokens = {
  palette: {
    bark: "#2c1a0e",
    barkDark: "#1a0f08",
    gold: "#b8860b",
    goldLight: "#d4a843",
    goldLighter: "#e6c060",
    cream: "#f5ede0",
    creamLight: "#faf7f2",
    muted: "#7a6e65",
    mutedLight: "#9e8a7a",
    forest: "#0e2e1f",
    error: "#c0392b",
    white: "#ffffff",
    black: "#000000",
  },
  shape: {
    pill: "9999px",
    xl: 24,
    lg: 16,
    md: 12,
    sm: 8,
    xs: 4,
    none: 2,
  },
  spacing: {
    section: { xs: 6, sm: 8, md: 10, lg: 12 },
    sectionDense: { xs: 4, sm: 6, md: 8 },
    page: { xs: 2, sm: 4, md: 6, lg: 8 },
  },
} as const;

// ---------------------------------------------------------------------------
// Module augmentation so the theme knows about our custom palette.
// ---------------------------------------------------------------------------

declare module "@mui/material/styles" {
  interface Palette {
    awm: typeof awmTokens.palette;
  }
  interface PaletteOptions {
    awm: typeof awmTokens.palette;
  }
}

// ---------------------------------------------------------------------------
// Theme construction
// ---------------------------------------------------------------------------

export const baseTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: awmTokens.palette.gold,
      light: awmTokens.palette.goldLight,
      dark: "#8a6508",
      contrastText: awmTokens.palette.barkDark,
    },
    secondary: {
      main: awmTokens.palette.bark,
      light: awmTokens.palette.muted,
      dark: awmTokens.palette.barkDark,
      contrastText: awmTokens.palette.white,
    },
    error: {
      main: awmTokens.palette.error,
    },
    background: {
      default: awmTokens.palette.white,
      paper: awmTokens.palette.creamLight,
    },
    text: {
      primary: awmTokens.palette.bark,
      secondary: awmTokens.palette.muted,
    },
    divider: "rgba(44, 26, 14, 0.12)",
    awm: awmTokens.palette,
  },
  typography: {
    fontFamily: "var(--font-sans), 'Jost', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h1: {
      fontFamily: "var(--font-heading), 'Nunito Sans', 'Jost', sans-serif",
      fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
      fontWeight: 600,
      lineHeight: 1.08,
      color: "var(--awm-bark)",
    },
    h2: {
      fontFamily: "var(--font-heading), 'Nunito Sans', 'Jost', sans-serif",
      fontSize: "clamp(2rem, 4vw, 3.5rem)",
      fontWeight: 600,
      lineHeight: 1.1,
      color: "var(--awm-bark)",
    },
    h3: {
      fontFamily: "var(--font-heading), 'Nunito Sans', 'Jost', sans-serif",
      fontSize: "clamp(1.6rem, 3vw, 2.5rem)",
      fontWeight: 600,
      lineHeight: 1.15,
      color: "var(--awm-bark)",
    },
    h4: {
      fontFamily: "var(--font-heading), 'Nunito Sans', 'Jost', sans-serif",
      fontSize: "clamp(1.25rem, 2vw, 1.5rem)",
      fontWeight: 600,
      lineHeight: 1.25,
      color: "var(--awm-bark)",
    },
    h5: {
      fontFamily: "var(--font-heading), 'Nunito Sans', 'Jost', sans-serif",
      fontSize: "1.125rem",
      fontWeight: 600,
      lineHeight: 1.3,
      color: "var(--awm-bark)",
    },
    h6: {
      fontFamily: "var(--font-heading), 'Nunito Sans', 'Jost', sans-serif",
      fontSize: "1rem",
      fontWeight: 600,
      lineHeight: 1.35,
      color: "var(--awm-bark)",
    },
    body1: {
      fontFamily: "var(--font-sans), 'Jost', sans-serif",
      fontSize: "1rem",
      fontWeight: 400,
      lineHeight: 1.6,
      color: "var(--awm-bark)",
    },
    body2: {
      fontFamily: "var(--font-sans), 'Jost', sans-serif",
      fontSize: "0.95rem",
      fontWeight: 400,
      lineHeight: 1.6,
      color: "var(--awm-muted)",
    },
    button: {
      fontFamily: "var(--font-sans), 'Jost', sans-serif",
      fontSize: "0.95rem",
      fontWeight: 600,
      textTransform: "none",
    },
    caption: {
      fontFamily: "var(--font-sans), 'Jost', sans-serif",
      fontSize: "0.85rem",
      fontWeight: 400,
      lineHeight: 1.5,
      color: "var(--awm-muted)",
    },
    overline: {
      fontFamily: "var(--font-sans), 'Jost', sans-serif",
      fontSize: "0.7rem",
      fontWeight: 600,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: "var(--awm-gold)",
    },
  },
  shape: {
    borderRadius: awmTokens.shape.md,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: awmTokens.shape.pill,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: "var(--font-sans), 'Jost', sans-serif",
          fontSize: "0.85rem",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontFamily: "var(--font-sans), 'Jost', sans-serif",
          fontSize: "0.95rem",
        },
      },
    },
  },
});

export const awmTheme = responsiveFontSizes(baseTheme, {
  breakpoints: ["xs", "sm", "md", "lg"],
  disableAlign: true,
  factor: 2,
  variants: ["h1", "h2", "h3", "h4", "h5", "h6"],
});

export type AwmColorMode = "light" | "dark";

export function createAwmTheme(mode: AwmColorMode) {
  if (mode === "light") return awmTheme;

  return createTheme(awmTheme, {
    palette: {
      mode: "dark",
      primary: {
        main: "#e1b957",
        light: "#f0cf7a",
        dark: "#b78b2d",
        contrastText: "#101713",
      },
      secondary: {
        main: "#9bd5b5",
        light: "#c7ead6",
        dark: "#5c9878",
        contrastText: "#101713",
      },
      background: {
        default: "#101713",
        paper: "#18211c",
      },
      text: {
        primary: "#f4eadb",
        secondary: "#c5b9ae",
      },
      divider: "rgba(240, 207, 122, 0.18)",
      awm: awmTokens.palette,
    },
  });
}

export type AwmTheme = typeof awmTheme;

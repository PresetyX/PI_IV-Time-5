import { createTheme } from '@mui/material';

export const tokens = {
  fontFamily: '"Manrope", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontWeight: {
    bold: 700,
    extraBold: 800,
  },
  fontSize: {
    caption: 12,
    small: 13,
    body: 14,
    button: 15,
    base: 16,
    lead: 17,
    title: 20,
    heading: 26,
    display: 34,
  },
  colors: {
    text: '#111111',
    textSecondary: '#555555',
    textMuted: '#777777',
    border: '#E6E6E6',
    divider: '#EEEEEE',
    surface: '#F4F4F4',
    panel: '#FAFAFA',
    background: '#FFFFFF',
    error: '#B3261E',
    success: '#157A4A',
  },
  spacingUnit: 4,
  radius: {
    button: 16,
    card: 18,
  },
  touchTarget: 44,
} as const;

export const DEFAULT_PRIMARY_COLOR: string = tokens.colors.text;

export function createAppTheme(primaryColor: string = DEFAULT_PRIMARY_COLOR) {
  const { colors, fontSize, fontWeight, radius, touchTarget } = tokens;

  return createTheme({
    spacing: tokens.spacingUnit,
    shape: { borderRadius: radius.button },
    palette: {
      primary: { main: primaryColor },
      error: { main: colors.error },
      success: { main: colors.success },
      text: {
        primary: colors.text,
        secondary: colors.textSecondary,
        disabled: colors.textMuted,
      },
      divider: colors.divider,
      background: { default: colors.background, paper: colors.background },
      grey: { 50: colors.panel, 100: colors.surface, 300: colors.border },
    },
    typography: {
      fontFamily: tokens.fontFamily,
      fontWeightRegular: fontWeight.bold,
      fontWeightMedium: fontWeight.bold,
      fontWeightBold: fontWeight.extraBold,
      h1: { fontSize: fontSize.display, fontWeight: fontWeight.extraBold, lineHeight: 1.2 },
      h2: { fontSize: fontSize.heading, fontWeight: fontWeight.extraBold, lineHeight: 1.25 },
      h3: { fontSize: fontSize.title, fontWeight: fontWeight.extraBold, lineHeight: 1.3 },
      h4: { fontSize: fontSize.lead, fontWeight: fontWeight.extraBold, lineHeight: 1.35 },
      h5: { fontSize: fontSize.base, fontWeight: fontWeight.extraBold, lineHeight: 1.4 },
      h6: { fontSize: fontSize.button, fontWeight: fontWeight.extraBold, lineHeight: 1.4 },
      subtitle1: { fontSize: fontSize.lead, fontWeight: fontWeight.bold, lineHeight: 1.4 },
      subtitle2: { fontSize: fontSize.button, fontWeight: fontWeight.bold, lineHeight: 1.4 },
      body1: { fontSize: fontSize.base, fontWeight: fontWeight.bold, lineHeight: 1.5 },
      body2: { fontSize: fontSize.body, fontWeight: fontWeight.bold, lineHeight: 1.5 },
      button: {
        fontSize: fontSize.button,
        fontWeight: fontWeight.extraBold,
        lineHeight: 1.2,
        textTransform: 'none',
      },
      caption: { fontSize: fontSize.caption, fontWeight: fontWeight.bold, lineHeight: 1.4 },
      overline: {
        fontSize: fontSize.small,
        fontWeight: fontWeight.extraBold,
        lineHeight: 1.4,
        letterSpacing: 0.5,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: colors.background, color: colors.text },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: radius.button, textTransform: 'none' },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: radius.card,
            border: `1px solid ${colors.border}`,
            boxShadow: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: { borderRadius: radius.card },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: radius.button,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.border },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: touchTarget,
            textTransform: 'none',
            fontSize: fontSize.body,
            fontWeight: fontWeight.extraBold,
          },
        },
      },
    },
  });
}

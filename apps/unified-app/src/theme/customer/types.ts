import type { ColorValue, TextStyle, ViewStyle } from 'react-native';

export type CustomerThemeColors = {
  background: string;
  surface: string;
  surfaceContainer: string;
  surfaceContainerLow: string;
  surfaceContainerHigh: string;
  surfaceVariant: string;
  bgDeep: string;
  bgSurface: string;
  bgGlass: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  tertiary: string;
  accentPrimary: string;
  accentPrimaryMuted: string;
  accentGlow: string;
  accentSuccess: string;
  accentWarning: string;
  accentDanger: string;
  error: string;
  errorContainer: string;
  onError: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  borderSubtle: string;
  borderGlass: string;
  cardBorder: string;
  inputFieldBg: string;
  inputFieldBorder: string;
  readOnlyFieldBg: string;
  readOnlyFieldBorder: string;
  dividerSubtle: string;
  chipActiveBg: string;
  chipActiveBorder: string;
  chipInactiveBg: string;
  overlay: string;
  white: string;
};

type GradientStops = readonly [ColorValue, ColorValue, ...ColorValue[]];

export type CustomerTheme = {
  colors: CustomerThemeColors;
  gradients: {
    card: GradientStops;
    hero: GradientStops;
    canvas: GradientStops;
    ambientPrimary: GradientStops;
    ambientSecondary: GradientStops;
  };
  blur: {
    cardIntensity: number;
    barIntensity: number;
  };
  spacing: {
    base: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
    marginMobile: number;
    gutter: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
  shadow: {
    cardGlow: ViewStyle;
    primaryGlow: ViewStyle;
  };
  typography: {
    displayLg: TextStyle;
    displayMd: TextStyle;
    bodyLg: TextStyle;
    body: TextStyle;
    bodyMedium: TextStyle;
    caption: TextStyle;
    label: TextStyle;
    mono: TextStyle;
    monoMd: TextStyle;
  };
  motion: {
    staggerMs: number;
    fadeDurationMs: number;
  };
  fonts: {
    display: string;
    body: string;
    bodyMedium: string;
    bodySemiBold: string;
    mono: string;
    monoBold: string;
  };
  appearance: 'dark' | 'light';
  blurTint: 'dark' | 'light';
  useGlassBlur: boolean;
};

import type { CustomerTheme } from './types';

/** Layout tokens shared by Signal Glass and Prime Light — only colors differ between themes. */
export const customerLayoutTokens: Pick<
  CustomerTheme,
  'spacing' | 'radius' | 'typography' | 'motion' | 'fonts'
> = {
  spacing: {
    base: 4,
    xs: 8,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
    xxl: 32,
    xxxl: 48,
    marginMobile: 20,
    gutter: 16,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 999,
  },
  typography: {
    displayLg: { fontSize: 32, fontWeight: '700', lineHeight: 40, letterSpacing: -0.32 },
    displayMd: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
    bodyLg: { fontSize: 18, fontWeight: '400', lineHeight: 28 },
    body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
    bodyMedium: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
    caption: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
    label: { fontSize: 12, fontWeight: '600', lineHeight: 16, letterSpacing: 0.5 },
    mono: { fontSize: 20, fontWeight: '600', lineHeight: 24, letterSpacing: 0.4 },
    monoMd: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  },
  motion: {
    staggerMs: 100,
    fadeDurationMs: 350,
  },
  fonts: {
    display: 'HankenGrotesk_700Bold',
    body: 'HankenGrotesk_400Regular',
    bodyMedium: 'HankenGrotesk_500Medium',
    bodySemiBold: 'HankenGrotesk_600SemiBold',
    mono: 'JetBrainsMono_400Regular',
    monoBold: 'JetBrainsMono_700Bold',
  },
};

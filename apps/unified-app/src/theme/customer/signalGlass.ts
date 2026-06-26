/** Signal Glass design tokens — customer-facing dark glass UI */
export const signalGlass = {
  colors: {
    bgDeep: '#0A0F1E',
    bgSurface: '#111827',
    bgGlass: 'rgba(255,255,255,0.06)',
    accentPrimary: '#3B82F6',
    accentPrimaryMuted: 'rgba(59,130,246,0.15)',
    accentGlow: '#60A5FA',
    accentSuccess: '#10B981',
    accentWarning: '#F59E0B',
    accentDanger: '#EF4444',
    textPrimary: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textMuted: '#4B5563',
    borderSubtle: 'rgba(255,255,255,0.08)',
    overlay: 'rgba(0,0,0,0.55)',
    white: '#FFFFFF',
  },
  gradients: {
    card: ['rgba(59,130,246,0.12)', 'rgba(255,255,255,0.04)'] as const,
    hero: ['rgba(59,130,246,0.25)', 'rgba(10,15,30,0.9)'] as const,
    canvas: ['#0A0F1E', '#111827'] as const,
  },
  blur: {
    cardIntensity: 28,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  radius: {
    sm: 8,
    md: 16,
    lg: 24,
    pill: 999,
  },
  shadow: {
    cardGlow: {
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
  },
  typography: {
    displayLg: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
    displayMd: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24 },
    body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
    bodyMedium: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
    mono: { fontSize: 16, fontWeight: '700' as const, lineHeight: 22 },
  },
  motion: {
    staggerMs: 100,
    fadeDurationMs: 350,
  },
  fonts: {
    display: 'Inter_700Bold',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    mono: 'JetBrainsMono_400Regular',
    monoBold: 'JetBrainsMono_700Bold',
  },
} as const;

export type SignalGlassColors = typeof signalGlass.colors;

/** Signal Glass design tokens — customer-facing dark glass UI */
export const signalGlass = {
  colors: {
    bgDeep: '#0A0F1E',
    bgSurface: '#111827',
    bgGlass: 'rgba(255,255,255,0.06)',
    accentPrimary: '#3B82F6',
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
  fonts: {
    display: 'Inter_700Bold',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    mono: 'JetBrainsMono_400Regular',
    monoBold: 'JetBrainsMono_700Bold',
  },
} as const;

export type SignalGlassColors = typeof signalGlass.colors;

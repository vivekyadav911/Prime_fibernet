export const colors = {
  primaryNavy: '#1B3A6B',
  accentTeal: '#0D7377',
  successGreen: '#1A6B3A',
  warningAmber: '#D4820A',
  errorRed: '#C0392B',
  background: '#F5F7FA',
  surfaceWhite: '#FFFFFF',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  borderDefault: '#CCCCCC',
  // Aliases for existing components
  primary: '#1B3A6B',
  accent: '#0D7377',
  surface: '#F5F7FA',
  text: '#1A1A2E',
  textMuted: '#6B7280',
  error: '#C0392B',
  white: '#FFFFFF',
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  heading: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  subheading: { fontSize: 18, fontWeight: '500' as const, lineHeight: 26 },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  label: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
};

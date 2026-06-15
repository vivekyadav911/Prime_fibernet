import { colors as baseColors } from '@prime/ui';

/** Officer field-app palette (extends @prime/ui) */
export const officerColors = {
  drawerBg: '#0F172A',
  drawerActive: '#1E293B',
  drawerText: '#94A3B8',
  drawerActiveText: '#F8FAFC',
  drawerBadge: '#0EA5E9',
  emerald: '#10B981',
  emeraldLight: '#D1FAE5',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  red: '#EF4444',
  redLight: '#FEE2E2',
  statusPending: '#F59E0B',
  statusActive: '#0EA5E9',
  statusResolved: '#10B981',
  statusOverdue: '#EF4444',
  statusClosed: '#94A3B8',
  priorityCritical: '#EF4444',
  priorityHigh: '#F97316',
  priorityMedium: '#F59E0B',
  priorityLow: '#10B981',
} as const;

export const colors = {
  ...baseColors,
  ...officerColors,
  overlay: 'rgba(0,0,0,0.45)',
  tier: {
    basic: '#4B5563',
    standard: '#0A5C5F',
    premium: '#2E5090',
    business: '#7C3AED',
  },
} as const;

/** Gradient pairs for plan cards by speed tier */
export const speedTierGradients = {
  basic: [baseColors.textSecondary, colors.tier.basic] as const,
  standard: [baseColors.accentTeal, colors.tier.standard] as const,
  premium: [baseColors.primaryNavy, colors.tier.premium] as const,
  business: ['#5B21B6', colors.tier.business] as const,
  none: [baseColors.borderDefault, baseColors.textSecondary] as const,
};

export type SpeedTierKey = keyof typeof speedTierGradients;

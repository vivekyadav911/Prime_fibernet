import { colors as baseColors } from '@prime/ui';

export const colors = {
  ...baseColors,
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

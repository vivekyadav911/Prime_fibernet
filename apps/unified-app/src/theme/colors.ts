export { colors } from '@prime/ui';

import { colors as base } from '@prime/ui';

/** Gradient pairs for plan cards by speed tier */
export const speedTierGradients = {
  basic: [base.textSecondary, '#4B5563'] as const,
  standard: [base.accentTeal, '#0A5C5F'] as const,
  premium: [base.primaryNavy, '#2E5090'] as const,
  business: ['#5B21B6', '#7C3AED'] as const,
  none: [base.borderDefault, base.textSecondary] as const,
};

export type SpeedTierKey = keyof typeof speedTierGradients;

import type { SpeedTierKey } from '@/theme/colors';

export function getSpeedTier(speedMbps: number): SpeedTierKey {
  if (speedMbps >= 500) return 'business';
  if (speedMbps >= 200) return 'premium';
  if (speedMbps >= 100) return 'standard';
  if (speedMbps > 0) return 'basic';
  return 'none';
}

export function tierLabel(tier: SpeedTierKey): string {
  if (tier === 'none') return 'Other';
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export const PLAN_FILTER_CATEGORIES = ['All', 'Basic', 'Standard', 'Premium', 'Business'] as const;
export type PlanFilterCategory = (typeof PLAN_FILTER_CATEGORIES)[number];

export function planMatchesCategory(speedMbps: number, category: PlanFilterCategory): boolean {
  if (category === 'All') return true;
  return tierLabel(getSpeedTier(speedMbps)) === category;
}

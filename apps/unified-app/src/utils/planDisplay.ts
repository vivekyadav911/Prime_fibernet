export function getPlanTierLabel(speedMbps: number, isFeatured?: boolean): string {
  if (isFeatured) return 'PROFESSIONAL';
  if (speedMbps >= 500) return 'ULTRA STREAM';
  if (speedMbps >= 200) return 'PROFESSIONAL';
  return 'ESSENTIAL';
}

export function getPlanDataLabel(plan: {
  isUnlimited?: boolean;
  dataLimitGb?: number | null;
}): string {
  if (plan.isUnlimited) return 'Unlimited Data';
  if (plan.dataLimitGb) return `${plan.dataLimitGb} GB`;
  return 'Unlimited Data';
}

/** Price period suffix for customer plan cards (e.g. "mo", "90 days"). */
export function getPlanPricePeriodLabel(validityDays: number): string {
  if (validityDays === 30) return 'mo';
  if (validityDays > 0) return `${validityDays} days`;
  return 'mo';
}

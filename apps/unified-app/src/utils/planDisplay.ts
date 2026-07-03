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

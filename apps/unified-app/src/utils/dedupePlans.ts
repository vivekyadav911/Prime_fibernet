import type { Plan } from '@prime/types';

/** Keep one catalog row per speed tier (lowest monthly price wins). */
export function dedupePlansBySpeed(plans: Plan[]): Plan[] {
  const bySpeed = new Map<number, Plan>();

  for (const plan of plans) {
    const existing = bySpeed.get(plan.speedMbps);
    if (!existing) {
      bySpeed.set(plan.speedMbps, plan);
      continue;
    }

    const keep = pickPreferredPlan(existing, plan);
    bySpeed.set(plan.speedMbps, keep);
  }

  return [...bySpeed.values()].sort((a, b) => a.speedMbps - b.speedMbps);
}

function pickPreferredPlan(a: Plan, b: Plan): Plan {
  if (a.price !== b.price) return a.price < b.price ? a : b;
  if (Boolean(a.isFeatured) !== Boolean(b.isFeatured)) {
    return a.isFeatured ? a : b;
  }
  return a.id <= b.id ? a : b;
}

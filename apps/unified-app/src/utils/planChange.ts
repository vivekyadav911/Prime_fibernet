import type { Plan } from '@prime/types';

export type PlanChangeDirection = 'current' | 'upgrade' | 'downgrade' | 'switch';

export function getPlanChangeDirection(
  currentPlan: Pick<Plan, 'id' | 'speedMbps'> | null | undefined,
  targetPlan: Pick<Plan, 'id' | 'speedMbps'>,
): PlanChangeDirection {
  if (!currentPlan) return 'switch';
  if (currentPlan.id === targetPlan.id) return 'current';
  if (targetPlan.speedMbps > currentPlan.speedMbps) return 'upgrade';
  if (targetPlan.speedMbps < currentPlan.speedMbps) return 'downgrade';
  return 'switch';
}

export function planChangeCtaLabel(direction: PlanChangeDirection): string {
  switch (direction) {
    case 'current':
      return 'Current plan';
    case 'upgrade':
      return 'Upgrade';
    case 'downgrade':
      return 'Downgrade';
    default:
      return 'View plan';
  }
}

export function planChangeActionLabel(direction: PlanChangeDirection, speedMbps: number): string {
  switch (direction) {
    case 'current':
      return 'Current plan';
    case 'upgrade':
      return `Upgrade to ${speedMbps} Mbps`;
    case 'downgrade':
      return `Downgrade to ${speedMbps} Mbps`;
    default:
      return 'Select this plan';
  }
}

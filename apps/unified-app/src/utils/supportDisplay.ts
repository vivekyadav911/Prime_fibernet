/**
 * Dev-mode warnings when canonical joins fail but an ID exists.
 */
export function warnUnknownCustomerFallback(customerId: string | null | undefined, context: string): void {
  if (!__DEV__) return;
  if (customerId) {
    console.warn(
      `[support] Unknown Customer fallback in ${context} despite customer_id=${customerId} — join may be broken`,
    );
  }
}

export function warnUnknownPlanFallback(planId: string | null | undefined, context: string): void {
  if (!__DEV__) return;
  if (planId) {
    console.warn(
      `[support] Unknown Plan fallback in ${context} despite plan_id=${planId} — join may be broken`,
    );
  }
}

export function resolveCustomerName(
  customerId: string | null | undefined,
  joinedName: string | null | undefined,
  fallbackContact?: string | null,
  context = 'support',
): string {
  const name = joinedName?.trim() || fallbackContact?.trim();
  if (name) return name;
  if (customerId) warnUnknownCustomerFallback(customerId, context);
  return 'Unknown Customer';
}

export function resolvePlanName(
  planId: string | null | undefined,
  joinedName: string | null | undefined,
  context = 'support',
): string | null {
  if (joinedName?.trim()) return joinedName.trim();
  if (!planId) return null;
  warnUnknownPlanFallback(planId, context);
  return 'Unknown Plan';
}

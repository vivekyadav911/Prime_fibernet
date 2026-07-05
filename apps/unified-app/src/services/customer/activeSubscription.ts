import type { SubscriptionStatus } from '@prime/types';

/** Subscription statuses that still represent an assigned plan (may be suspended). */
export const CURRENT_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['active', 'suspended'];

/** End of the calendar day for a DATE / ISO date string (local timezone). */
export function subscriptionEndMs(endAt: string): number {
  const dateOnly = endAt.slice(0, 10);
  const [y, m, d] = dateOnly.split('-').map(Number);
  if (!y || !m || !d) return Number.NaN;
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

export function isSubscriptionCurrent(
  status: string | null | undefined,
  endAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!status || !endAt) return false;
  if (!CURRENT_SUBSCRIPTION_STATUSES.includes(status as SubscriptionStatus)) return false;
  const endMs = subscriptionEndMs(endAt);
  if (Number.isNaN(endMs)) return false;
  return endMs >= now.getTime();
}

export function daysUntilSubscriptionEnd(endAt: string, now: Date = new Date()): number {
  const endMs = subscriptionEndMs(endAt);
  if (Number.isNaN(endMs)) return 0;
  return Math.ceil((endMs - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** YYYY-MM-DD for Supabase DATE columns — inclusive through end of today. */
export function activeSubscriptionCutoffDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** @deprecated Prefer {@link activeSubscriptionCutoffDate} for DATE columns. */
export function activeSubscriptionCutoffIso(now: Date = new Date()): string {
  return activeSubscriptionCutoffDate(now);
}

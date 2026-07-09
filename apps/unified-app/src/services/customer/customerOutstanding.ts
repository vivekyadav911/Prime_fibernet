import type { PaymentRecord, PaymentStatus } from '@/types/payments';

/** YYYY-MM billing period key from an ISO date string. */
export function billingPeriodKey(iso: string | null | undefined): string {
  if (!iso) return 'unknown';
  return iso.slice(0, 7);
}

const PENDING_STATUSES: PaymentStatus[] = ['initiated', 'pending_review', 'cash_collected'];
const FAILED_STATUSES: PaymentStatus[] = ['failed', 'cancelled'];
const SETTLED_STATUSES: PaymentStatus[] = ['confirmed', 'refunded'];

export type OutstandingPaymentRow = Pick<
  PaymentRecord,
  'id' | 'total_amount' | 'status' | 'billing_period_start' | 'created_at'
>;

export function isPendingPaymentStatus(status: PaymentStatus | string): boolean {
  return PENDING_STATUSES.includes(status as PaymentStatus);
}

export function isFailedPaymentStatus(status: PaymentStatus | string): boolean {
  return FAILED_STATUSES.includes(status as PaymentStatus);
}

export function isOpenPaymentStatus(status: PaymentStatus | string): boolean {
  return isPendingPaymentStatus(status) || isFailedPaymentStatus(status);
}

/** Pick one open payment per billing period — failed beats pending; newest wins within a tier. */
export function pickCanonicalOpenPaymentForPeriod<T extends OutstandingPaymentRow>(
  payments: T[],
  periodKey: string,
): T | null {
  const inPeriod = payments.filter(
    (p) => billingPeriodKey(p.billing_period_start ?? p.created_at) === periodKey,
  );
  if (!inPeriod.length) return null;

  const failed = inPeriod
    .filter((p) => isFailedPaymentStatus(p.status))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (failed.length) return failed[0] ?? null;

  const pending = inPeriod
    .filter((p) => isPendingPaymentStatus(p.status))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (pending.length) return pending[0] ?? null;

  return null;
}

export type ResolvedOutstanding = {
  amount: number;
  paymentId: string | null;
  billingPeriod: string | null;
};

export type SubscriptionBillAmount = {
  planAmount: number;
  taxAmount: number;
  lateFee: number;
  totalPayable: number;
  outstandingAmount: number;
};

/** Customer bill = plan list price (tax-inclusive). Late fee only when overdue. */
export function buildSubscriptionBillAmount(
  planPrice: number,
  options?: { isOverdue?: boolean; lateFeeRate?: number },
): SubscriptionBillAmount {
  if (planPrice <= 0) {
    return {
      planAmount: 0,
      taxAmount: 0,
      lateFee: 0,
      totalPayable: 0,
      outstandingAmount: 0,
    };
  }

  const isOverdue = options?.isOverdue ?? false;
  const lateFeeRate = options?.lateFeeRate ?? 0.05;
  const planAmount = planPrice;
  const taxAmount = 0;
  const lateFee = isOverdue ? Math.round(planAmount * lateFeeRate * 100) / 100 : 0;
  const totalPayable = planAmount + lateFee;

  return {
    planAmount,
    taxAmount,
    lateFee,
    totalPayable,
    outstandingAmount: totalPayable,
  };
}

/** Amount to charge at checkout — always prefer current plan price over stale payment rows. */
export function resolvePaymentChargeAmount(paymentTotal: number, planPrice: number): number {
  if (planPrice > 0) return planPrice;
  return paymentTotal;
}

/**
 * Current amount due = one billing cycle at plan list price (never sum duplicate checkout rows).
 * When a plan price is known, outstanding always matches the subscription price for the open cycle.
 */
export function resolveCurrentOutstanding(
  openPayments: OutstandingPaymentRow[],
  fallbackAmount: number,
  planPrice = 0,
  confirmedPayments: OutstandingPaymentRow[] = [],
  activeBillingPeriodStart?: string | null,
): ResolvedOutstanding {
  const settledPeriods = new Set(
    confirmedPayments.map((p) => billingPeriodKey(p.billing_period_start ?? p.created_at)),
  );

  const effectiveOpen = openPayments.filter(
    (p) => !settledPeriods.has(billingPeriodKey(p.billing_period_start ?? p.created_at)),
  );

  // ponytail: settled subscription cycle → no current bill even if orphan failed rows exist
  if (activeBillingPeriodStart) {
    const activeKey = billingPeriodKey(activeBillingPeriodStart);
    if (settledPeriods.has(activeKey)) {
      const openInActive = effectiveOpen.filter(
        (p) => billingPeriodKey(p.billing_period_start ?? p.created_at) === activeKey,
      );
      if (openInActive.length === 0) {
        return { amount: 0, paymentId: null, billingPeriod: null };
      }
    }
  }

  const periodKeys = [
    ...new Set(effectiveOpen.map((p) => billingPeriodKey(p.billing_period_start ?? p.created_at))),
  ].sort((a, b) => b.localeCompare(a));

  const currentPeriod = periodKeys[0] ?? null;
  const canonical = currentPeriod
    ? pickCanonicalOpenPaymentForPeriod(effectiveOpen, currentPeriod)
    : null;

  const hasOpenBill = effectiveOpen.length > 0;
  const owesForCycle = hasOpenBill || fallbackAmount > 0;

  if (settledPeriods.size > 0 && !hasOpenBill && fallbackAmount <= 0) {
    return {
      amount: 0,
      paymentId: null,
      billingPeriod: null,
    };
  }

  if (planPrice > 0 && owesForCycle && hasOpenBill) {
    return {
      amount: planPrice,
      paymentId: canonical?.id ?? null,
      billingPeriod: currentPeriod,
    };
  }

  if (!effectiveOpen.length) {
    return {
      amount: fallbackAmount > 0 ? fallbackAmount : 0,
      paymentId: null,
      billingPeriod: null,
    };
  }

  if (canonical) {
    return {
      amount: Number(canonical.total_amount),
      paymentId: canonical.id,
      billingPeriod: currentPeriod,
    };
  }

  return {
    amount: fallbackAmount > 0 ? fallbackAmount : 0,
    paymentId: null,
    billingPeriod: null,
  };
}

/**
 * Collapse duplicate open payments for the same month.
 * Paid/refunded rows are kept; open rows show failed over pending, one per period.
 */
export function dedupePaymentHistoryForDisplay(payments: PaymentRecord[]): PaymentRecord[] {
  const settled: PaymentRecord[] = [];
  const openByPeriod = new Map<string, PaymentRecord[]>();

  for (const payment of payments) {
    if (SETTLED_STATUSES.includes(payment.status)) {
      settled.push(payment);
      continue;
    }
    if (!isOpenPaymentStatus(payment.status)) continue;

    const key = billingPeriodKey(payment.billing_period_start ?? payment.created_at);
    const group = openByPeriod.get(key) ?? [];
    group.push(payment);
    openByPeriod.set(key, group);
  }

  const openCanonical: PaymentRecord[] = [];
  for (const [, group] of openByPeriod) {
    const periodKey = billingPeriodKey(
      group[0]?.billing_period_start ?? group[0]?.created_at,
    );
    const picked = pickCanonicalOpenPaymentForPeriod(group, periodKey);
    if (picked) openCanonical.push(picked);
  }

  return [...settled, ...openCanonical].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

import type { PaymentRecord, PaymentStatus } from '@/types/payments';

import {
  dedupePaymentHistoryForDisplay,
  isFailedPaymentStatus,
} from '@/services/customer/customerOutstanding';

export type PaymentStatusFilter = 'all' | 'paid' | 'pending' | 'failed';

export const PAYMENT_STATUS_FILTERS: Array<{ id: PaymentStatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'paid', label: 'Paid' },
  { id: 'pending', label: 'Pending' },
  { id: 'failed', label: 'Failed' },
];

const PENDING_STATUSES: PaymentStatus[] = ['initiated', 'pending_review', 'cash_collected'];
const FAILED_STATUSES: PaymentStatus[] = ['failed', 'cancelled'];

export function paymentMatchesStatusFilter(status: PaymentStatus, filter: PaymentStatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'paid') return status === 'confirmed';
  if (filter === 'pending') return PENDING_STATUSES.includes(status);
  if (filter === 'failed') return FAILED_STATUSES.includes(status);
  return true;
}

export function paymentMatchesDateRange(
  item: PaymentRecord,
  from: string | null,
  to: string | null,
): boolean {
  if (!from && !to) return true;
  const iso = item.billing_period_start ?? item.created_at;
  const day = iso.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export function filterPaymentHistory(
  items: PaymentRecord[],
  statusFilter: PaymentStatusFilter,
  dateFrom: string | null,
  dateTo: string | null,
): PaymentRecord[] {
  return dedupePaymentHistoryForDisplay(items).filter(
    (item) =>
      paymentMatchesStatusFilter(item.status, statusFilter) &&
      paymentMatchesDateRange(item, dateFrom, dateTo),
  );
}

export function paymentPeriodLabel(item: PaymentRecord): string {
  const iso = item.billing_period_start ?? item.created_at;
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function isFailedPayment(status: PaymentStatus): boolean {
  return isFailedPaymentStatus(status);
}

export function isPaidPayment(status: PaymentStatus): boolean {
  return status === 'confirmed';
}

export function isPendingPayment(status: PaymentStatus): boolean {
  return PENDING_STATUSES.includes(status);
}

export function isStalePendingPayment(createdAt: string, staleMinutes = 60): boolean {
  return Date.now() - new Date(createdAt).getTime() > staleMinutes * 60 * 1000;
}

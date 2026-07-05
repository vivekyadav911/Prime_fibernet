import type { PaymentStatus } from '@/types/payments';

import { CustomerStatusPill, type CustomerStatusTone } from '@/components/customer/ui/CustomerStatusPill';

const STATUS_LABELS: Partial<Record<PaymentStatus, string>> = {
  initiated: 'Pending',
  pending_review: 'Pending',
  cash_collected: 'Pending',
  confirmed: 'Paid',
  failed: 'Failed',
  cancelled: 'Failed',
  refunded: 'Refunded',
};

function toneForStatus(status: PaymentStatus | string): CustomerStatusTone {
  switch (status) {
    case 'confirmed':
      return 'paid';
    case 'failed':
    case 'cancelled':
      return 'failed';
    case 'pending_review':
    case 'initiated':
    case 'cash_collected':
      return 'pending';
    case 'refunded':
      return 'neutral';
    default:
      return 'neutral';
  }
}

type CustomerPaymentStatusPillProps = {
  status: PaymentStatus | string;
};

/** Customer-only payment status pill — do not use on officer/admin screens. */
export function CustomerPaymentStatusPill({ status }: CustomerPaymentStatusPillProps) {
  const label = STATUS_LABELS[status as PaymentStatus] ?? 'Pending';
  return <CustomerStatusPill label={label} tone={toneForStatus(status)} />;
}

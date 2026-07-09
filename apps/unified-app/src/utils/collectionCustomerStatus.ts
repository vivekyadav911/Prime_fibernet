import type { BillingStatus } from '@/components/payments';

export type CollectionCustomerStatusInput = {
  isBlocked: boolean;
  paymentStatus: string | null | undefined;
  collectionStatus: string | null | undefined;
};

export type CollectionCustomerStatusLabel = {
  primary: string;
  secondary: string | null;
  tone: 'active' | 'inactive' | 'warning' | 'success' | 'danger';
};

/** Account active/inactive + billing or collection qualifier for assignment cards. */
export function formatCollectionCustomerStatus(
  input: CollectionCustomerStatusInput,
): CollectionCustomerStatusLabel {
  const payment = (input.paymentStatus ?? 'pending').toLowerCase() as BillingStatus;
  const collection = (input.collectionStatus ?? 'inactive').toLowerCase();

  if (input.isBlocked || payment === 'suspended') {
    return { primary: 'Inactive', secondary: 'Suspended', tone: 'inactive' };
  }

  if (collection === 'collected') {
    return { primary: 'Active', secondary: 'Collected', tone: 'success' };
  }

  if (payment === 'overdue') {
    return { primary: 'Active', secondary: 'Overdue', tone: 'danger' };
  }

  if (payment === 'paid') {
    return { primary: 'Active', secondary: 'Paid', tone: 'success' };
  }

  if (collection === 'open' || collection === 'assigned' || collection === 'claimed') {
    const poolLabel =
      collection === 'open'
        ? 'In pool'
        : collection === 'assigned'
          ? 'Assigned'
          : 'Claimed';
    return { primary: 'Active', secondary: poolLabel, tone: 'warning' };
  }

  return { primary: 'Active', secondary: 'Due', tone: 'warning' };
}

import type { PaymentMethod, PaymentRecord, PaymentStatus } from '@/types/payments';

export type CollectionHistoryStatusFilter = 'all' | 'pending' | PaymentStatus;
export type CollectionHistorySortKey = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc';

export function applyCollectionHistoryFilters(
  rows: PaymentRecord[],
  filters: {
    statusFilter: CollectionHistoryStatusFilter;
    methodFilter: 'all' | PaymentMethod;
    search: string;
    sortKey: CollectionHistorySortKey;
  },
): PaymentRecord[] {
  let list = rows;

  if (filters.statusFilter === 'pending') {
    list = list.filter(
      (row) => row.status === 'pending_review' || row.status === 'cash_collected',
    );
  } else if (filters.statusFilter !== 'all') {
    list = list.filter((row) => row.status === filters.statusFilter);
  }

  if (filters.methodFilter !== 'all') {
    list = list.filter((row) => row.method === filters.methodFilter);
  }

  const q = filters.search.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (row) =>
        row.payment_number.toLowerCase().includes(q) ||
        row.customer_name.toLowerCase().includes(q) ||
        row.account_number.toLowerCase().includes(q),
    );
  }

  const sorted = [...list];
  sorted.sort((a, b) => {
    switch (filters.sortKey) {
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'amount_desc':
        return b.total_amount - a.total_amount;
      case 'amount_asc':
        return a.total_amount - b.total_amount;
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return sorted;
}

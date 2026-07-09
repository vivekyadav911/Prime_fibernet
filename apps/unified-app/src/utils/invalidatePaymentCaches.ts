import type { AppDispatch } from '@/store/store';
import { paymentCollectionApi } from '@/services/api/paymentCollectionApi';

/** Invalidate payment-related RTK Query caches immediately and again after a short delay. */
export function invalidatePaymentCaches(dispatch: AppDispatch): void {
  const tags = ['Payments', 'CustomerDashboard', 'Invoices'] as const;
  for (const tag of tags) {
    dispatch(paymentCollectionApi.util.invalidateTags([tag]));
  }
  setTimeout(() => {
    for (const tag of tags) {
      dispatch(paymentCollectionApi.util.invalidateTags([tag]));
    }
  }, 3000);
  setTimeout(() => {
    dispatch(paymentCollectionApi.util.invalidateTags(['Payments', 'CustomerDashboard']));
  }, 5000);
}

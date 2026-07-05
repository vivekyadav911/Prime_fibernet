import type { AppDispatch } from '@/store/store';
import { paymentCollectionApi } from '@/services/api/paymentCollectionApi';

/** Invalidate payment-related RTK Query caches immediately and again after a short delay. */
export function invalidatePaymentCaches(dispatch: AppDispatch): void {
  dispatch(paymentCollectionApi.util.invalidateTags(['Payments']));
  setTimeout(() => {
    dispatch(paymentCollectionApi.util.invalidateTags(['Payments']));
  }, 3000);
}

import type { RazorpayCheckoutCallbacks, RazorpayCheckoutOptions } from './types';

export async function openWebCheckout(
  _options: RazorpayCheckoutOptions,
  _callbacks: RazorpayCheckoutCallbacks,
): Promise<void> {
  throw new Error('Web Razorpay checkout is only available on web.');
}

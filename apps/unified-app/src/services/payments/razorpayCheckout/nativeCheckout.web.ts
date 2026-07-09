import type { RazorpayCheckoutCallbacks, RazorpayCheckoutOptions } from './types';

export class NativeRazorpayUnavailableError extends Error {
  constructor(message = 'Native Razorpay module is not available') {
    super(message);
    this.name = 'NativeRazorpayUnavailableError';
  }
}

export function isNativeRazorpayAvailable(): boolean {
  return false;
}

export function shouldUseNativeRazorpay(): boolean {
  return false;
}

export async function openNativeCheckout(
  _options: RazorpayCheckoutOptions,
  _callbacks: RazorpayCheckoutCallbacks,
): Promise<void> {
  throw new NativeRazorpayUnavailableError();
}

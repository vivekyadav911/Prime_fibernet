import { cashfreeAdapter } from './cashfree.ts';
import { easebuzzAdapter } from './easebuzz.ts';
import { paytmAdapter } from './paytm.ts';
import { payuAdapter } from './payu.ts';
import { razorpayAdapter } from './razorpay.ts';
import type { GatewayAdapter, GatewaySlug } from '../types.ts';

const adapters: Record<GatewaySlug, GatewayAdapter> = {
  razorpay: razorpayAdapter,
  easebuzz: easebuzzAdapter,
  payu: payuAdapter,
  cashfree: cashfreeAdapter,
  paytm: paytmAdapter,
};

export function getAdapter(slug: string): GatewayAdapter | null {
  return adapters[slug as GatewaySlug] ?? null;
}

export { razorpayAdapter, easebuzzAdapter, payuAdapter, cashfreeAdapter, paytmAdapter };

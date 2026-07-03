import type { GatewaySlug } from '@/types/payments';

export type PaymentProviderSlug = GatewaySlug;

export type PaymentCheckoutSession = {
  paymentId: string;
  orderId: string;
  gatewaySlug: PaymentProviderSlug;
  keyId: string;
  amount: number;
  checkoutUrl: string | null;
  checkoutParams: Record<string, string> | null;
};

export type InitiatePaymentRequest = {
  customerId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  amount: number;
  planName?: string;
  planId?: string;
  paymentMethod?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  dueDate?: string;
};

export type PaymentCustomerContext = {
  name: string;
  email: string;
  phone: string;
};

export interface PaymentProvider {
  readonly slug: PaymentProviderSlug;
  readonly displayName: string;
}

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProviderSlug, string> = {
  easebuzz: 'Easebuzz',
  razorpay: 'Razorpay',
  payu: 'PayU',
  paytm: 'Paytm',
  cashfree: 'Cashfree',
};

export function resolvePaymentProviderSlug(
  gatewaySlug: string | null | undefined,
): PaymentProviderSlug {
  if (gatewaySlug && gatewaySlug in PAYMENT_PROVIDER_LABELS) {
    return gatewaySlug as PaymentProviderSlug;
  }
  return 'easebuzz';
}

export function getPaymentProvider(slug: PaymentProviderSlug): PaymentProvider {
  return {
    slug,
    displayName: PAYMENT_PROVIDER_LABELS[slug] ?? 'Payment gateway',
  };
}

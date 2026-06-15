export type GatewaySlug = 'razorpay' | 'easebuzz' | 'payu' | 'cashfree' | 'paytm';

export type PaymentMethodType = 'card' | 'upi' | 'netbanking' | 'wallet' | 'cash' | 'cheque';

export type OrderContext = {
  paymentId: string;
  amount: number;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  planName: string;
  accountNumber: string;
  webhookBaseUrl: string;
};

export type OrderResult = {
  orderId: string;
  checkoutUrl?: string;
  publicKey?: string;
  checkoutParams?: Record<string, string>;
  raw?: Record<string, unknown>;
};

export type WebhookParseResult = {
  verified: boolean;
  orderId: string;
  gatewayPaymentId: string;
  signature: string;
  method?: string;
  status: 'success' | 'failed';
  raw: Record<string, unknown>;
};

export interface GatewayAdapter {
  slug: GatewaySlug;
  createOrder(creds: Record<string, string>, ctx: OrderContext): Promise<OrderResult>;
  verifyWebhook(
    creds: Record<string, string>,
    body: string,
    headers: Headers,
    payload: Record<string, unknown>,
  ): Promise<WebhookParseResult>;
  testConnection(creds: Record<string, string>): Promise<{ ok: boolean; message: string }>;
}

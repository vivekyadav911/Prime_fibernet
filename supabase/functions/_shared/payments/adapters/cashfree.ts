import type { GatewayAdapter, OrderContext, OrderResult, WebhookParseResult } from '../types.ts';

function cashfreeBase(env: string): string {
  return env === 'sandbox' ? 'https://sandbox.cashfree.com' : 'https://api.cashfree.com';
}

export const cashfreeAdapter: GatewayAdapter = {
  slug: 'cashfree',

  async createOrder(creds, ctx: OrderContext): Promise<OrderResult> {
    const appId = creds.app_id ?? '';
    const secretKey = creds.secret_key ?? '';
    const env = creds.env ?? 'production';
    const orderId = `CF_${ctx.paymentId.replace(/-/g, '').slice(0, 16)}`;
    if (!appId || !secretKey) {
      return {
        orderId,
        publicKey: appId,
        checkoutUrl: `${ctx.webhookBaseUrl}/functions/v1/verify-payment?dev=1&paymentId=${ctx.paymentId}`,
      };
    }
    const base = cashfreeBase(env === 'sandbox' ? 'sandbox' : 'production');
    const res = await fetch(`${base}/pg/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: ctx.amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: ctx.customerId,
          customer_name: ctx.customerName,
          customer_email: ctx.customerEmail,
          customer_phone: ctx.customerPhone || '9999999999',
        },
        order_meta: {
          return_url: `${ctx.webhookBaseUrl}/functions/v1/payment-webhook?gateway=cashfree&payment_id=${ctx.paymentId}`,
          notify_url: `${ctx.webhookBaseUrl}/functions/v1/payment-webhook?gateway=cashfree`,
        },
      }),
    });
    if (!res.ok) throw new Error(`Cashfree order failed: ${await res.text()}`);
    const data = await res.json();
    return {
      orderId: String(data.order_id ?? orderId),
      publicKey: appId,
      checkoutUrl: data.payment_link ?? data.payment_session_id,
      raw: data,
    };
  },

  async verifyWebhook(creds, body, headers, payload): Promise<WebhookParseResult> {
    const signature = headers.get('x-webhook-signature') ?? '';
    const timestamp = headers.get('x-webhook-timestamp') ?? '';
    const secretKey = creds.secret_key ?? '';
    let verified = false;
    if (secretKey && signature && timestamp) {
      const signed = `${timestamp}${body}`;
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secretKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );
      const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed));
      const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
      verified = expected === signature;
    }
    const data = (payload.data as Record<string, unknown>) ?? payload;
    const order = (data.order as Record<string, unknown>) ?? data;
    const payment = (data.payment as Record<string, unknown>) ?? {};
    const orderId = String(order.order_id ?? payload.order_id ?? '');
    const gatewayPaymentId = String(payment.cf_payment_id ?? payment.payment_id ?? '');
    const statusRaw = String(payment.payment_status ?? order.order_status ?? '').toUpperCase();
    return {
      verified: verified || Deno.env.get('PAYMENT_WEBHOOK_SKIP_VERIFY') === '1',
      orderId,
      gatewayPaymentId,
      signature,
      method: 'upi',
      status: statusRaw === 'SUCCESS' || statusRaw === 'PAID' ? 'success' : 'failed',
      raw: payload,
    };
  },

  async testConnection(creds) {
    if (!creds.app_id || !creds.secret_key) {
      return { ok: false, message: 'Missing app_id or secret_key' };
    }
    return { ok: true, message: 'Cashfree credentials saved' };
  },
};

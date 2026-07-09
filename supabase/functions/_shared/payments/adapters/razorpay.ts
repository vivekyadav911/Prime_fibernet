import type { GatewayAdapter, OrderContext, OrderResult, WebhookParseResult } from '../types.ts';

function razorpayReceipt(paymentId: string, customerId: string): string {
  const shortId = customerId.replace(/-/g, '').slice(0, 6).toUpperCase();
  const timePart = Date.now().toString(36).toUpperCase();
  return `PF${shortId}${timePart}`.slice(0, 40);
}

async function hmacSha256(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Gateway-row credentials win; Supabase secrets fill the gaps. */
export function withEnvFallback(creds: Record<string, string>): Record<string, string> {
  return {
    ...creds,
    key_id: creds.key_id || Deno.env.get('RAZORPAY_KEY_ID') || '',
    key_secret:
      creds.key_secret ||
      Deno.env.get('RAZORPAY_KEY_SECRET') ||
      Deno.env.get('RAZORPAY_SECRET_KEY') ||
      '',
    webhook_secret: creds.webhook_secret || Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '',
  };
}

export function resolveRazorpayPublicKey(creds: Record<string, string>): string {
  const resolved = withEnvFallback(creds);
  return resolved.key_id ?? '';
}

export const razorpayAdapter: GatewayAdapter = {
  slug: 'razorpay',

  async createOrder(rawCreds, ctx: OrderContext): Promise<OrderResult> {
    const creds = withEnvFallback(rawCreds);
    const keyId = creds.key_id;
    const keySecret = creds.key_secret;
    if (!keyId || !keySecret) {
      return {
        orderId: `dev_razorpay_${ctx.paymentId}`,
        publicKey: keyId ?? 'rzp_test_dev',
        checkoutParams: { dev: '1' },
      };
    }
    const auth = btoa(`${keyId}:${keySecret}`);
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(ctx.amount * 100),
        currency: 'INR',
        receipt: razorpayReceipt(ctx.paymentId, ctx.customerId),
        notes: { customer_id: ctx.customerId, payment_id: ctx.paymentId },
      }),
    });
    if (!res.ok) throw new Error(`Razorpay order failed: ${await res.text()}`);
    const order = await res.json();
    return { orderId: order.id, publicKey: keyId, raw: order };
  },

  async verifyWebhook(rawCreds, body, headers, payload): Promise<WebhookParseResult> {
    const creds = withEnvFallback(rawCreds);
    const webhookSecret = creds.webhook_secret ?? '';
    const signature = headers.get('x-razorpay-signature') ?? '';
    let verified = false;
    if (webhookSecret && signature) {
      const expected = await hmacSha256(webhookSecret, body);
      verified = expected === signature;
    }
    const entity = payload?.payload?.payment?.entity as Record<string, unknown> | undefined;
    const orderId = String(entity?.order_id ?? '');
    const gatewayPaymentId = String(entity?.id ?? '');
    const status = entity?.status === 'captured' ? 'success' : 'failed';
    return {
      verified: verified || Deno.env.get('PAYMENT_WEBHOOK_SKIP_VERIFY') === '1',
      orderId,
      gatewayPaymentId,
      signature,
      method: String(entity?.method ?? 'upi'),
      status,
      raw: payload,
    };
  },

  async verifyPaymentSignature(
    rawCreds: Record<string, string>,
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<boolean> {
    const keySecret = withEnvFallback(rawCreds).key_secret;
    if (!keySecret || !signature) return false;
    const body = `${orderId}|${paymentId}`;
    const expected = await hmacSha256(keySecret, body);
    return expected === signature;
  },

  async fetchCapturedPayment(
    rawCreds: Record<string, string>,
    orderId: string,
  ): Promise<{ paymentId: string; method: string } | null> {
    const creds = withEnvFallback(rawCreds);
    const keyId = creds.key_id;
    const keySecret = creds.key_secret;
    if (!keyId || !keySecret || !orderId) return null;
    const auth = btoa(`${keyId}:${keySecret}`);
    const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}/payments`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const items = (data?.items ?? []) as Array<Record<string, unknown>>;
    const captured = items.find((p) => p.status === 'captured');
    if (!captured) return null;
    return {
      paymentId: String(captured.id),
      method: String(captured.method ?? 'upi'),
    };
  },

  async testConnection(rawCreds) {
    const creds = withEnvFallback(rawCreds);
    if (!creds.key_id || !creds.key_secret) {
      return { ok: false, message: 'Missing key_id or key_secret' };
    }
    const auth = btoa(`${creds.key_id}:${creds.key_secret}`);
    const res = await fetch('https://api.razorpay.com/v1/orders?count=1', {
      headers: { Authorization: `Basic ${auth}` },
    });
    return res.ok
      ? { ok: true, message: 'Razorpay credentials verified' }
      : { ok: false, message: await res.text() };
  },
};

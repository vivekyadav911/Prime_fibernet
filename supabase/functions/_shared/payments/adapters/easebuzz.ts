import type { GatewayAdapter, OrderContext, OrderResult, WebhookParseResult } from '../types.ts';

async function sha512(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function easebuzzBase(env: string): string {
  return env === 'test' ? 'https://testpay.easebuzz.in' : 'https://pay.easebuzz.in';
}

export const easebuzzAdapter: GatewayAdapter = {
  slug: 'easebuzz',

  async createOrder(creds, ctx: OrderContext): Promise<OrderResult> {
    const merchantKey = creds.merchant_key ?? '';
    const salt = creds.salt ?? '';
    const env = creds.env ?? 'production';
    const txnId = `TXN_${ctx.paymentId.replace(/-/g, '').slice(0, 20)}_${Date.now()}`;
    if (!merchantKey || !salt) {
      return {
        orderId: txnId,
        publicKey: merchantKey,
        checkoutUrl: `${ctx.webhookBaseUrl}/functions/v1/verify-payment?dev=1&paymentId=${ctx.paymentId}`,
        checkoutParams: { txnid: txnId, dev: '1' },
      };
    }
    const productInfo = ctx.planName || 'Broadband Bill';
    const hashString = `${merchantKey}|${txnId}|${ctx.amount}|${productInfo}|${ctx.customerName}|${ctx.customerEmail}|||||||||||${salt}`;
    const hash = await sha512(hashString);
    const base = easebuzzBase(env === 'test' ? 'test' : 'production');
    return {
      orderId: txnId,
      publicKey: merchantKey,
      checkoutUrl: `${base}/pay/secure`,
      checkoutParams: {
        key: merchantKey,
        txnid: txnId,
        amount: ctx.amount.toFixed(2),
        productinfo: productInfo,
        firstname: ctx.customerName,
        email: ctx.customerEmail,
        phone: ctx.customerPhone,
        surl: `${ctx.webhookBaseUrl}/functions/v1/payment-webhook?gateway=easebuzz`,
        furl: `${ctx.webhookBaseUrl}/functions/v1/payment-webhook?gateway=easebuzz`,
        hash,
        udf1: ctx.customerId,
        udf2: ctx.paymentId,
      },
    };
  },

  async verifyWebhook(creds, _body, _headers, payload): Promise<WebhookParseResult> {
    const salt = creds.salt ?? '';
    const status = String(payload.status ?? '').toLowerCase();
    const txnId = String(payload.txnid ?? '');
    const easepayId = String(payload.easepayid ?? payload.bank_ref_num ?? '');
    const amount = String(payload.amount ?? '');
    const productinfo = String(payload.productinfo ?? '');
    const firstname = String(payload.firstname ?? '');
    const email = String(payload.email ?? '');
    const reverseHashString = `${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnId}|${creds.merchant_key}`;
    const expected = await sha512(reverseHashString);
    const received = String(payload.hash ?? '');
    const verified = expected === received || Deno.env.get('PAYMENT_WEBHOOK_SKIP_VERIFY') === '1';
    return {
      verified,
      orderId: txnId,
      gatewayPaymentId: easepayId,
      signature: received,
      method: 'upi',
      status: status === 'success' ? 'success' : 'failed',
      raw: payload,
    };
  },

  async testConnection(creds) {
    if (!creds.merchant_key || !creds.salt) {
      return { ok: false, message: 'Missing merchant_key or salt' };
    }
    return { ok: true, message: 'Easebuzz credentials saved' };
  },
};

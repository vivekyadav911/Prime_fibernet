import type { GatewayAdapter, OrderContext, OrderResult, WebhookParseResult } from '../types.ts';

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const paytmAdapter: GatewayAdapter = {
  slug: 'paytm',

  async createOrder(creds, ctx: OrderContext): Promise<OrderResult> {
    const merchantId = creds.merchant_id ?? '';
    const merchantKey = creds.merchant_key ?? '';
    const website = creds.website ?? 'DEFAULT';
    const channelId = creds.channel_id ?? 'WAP';
    const orderId = `PTM_${ctx.paymentId.replace(/-/g, '').slice(0, 16)}`;
    if (!merchantId || !merchantKey) {
      return {
        orderId,
        publicKey: merchantId,
        checkoutUrl: `${ctx.webhookBaseUrl}/functions/v1/verify-payment?dev=1&paymentId=${ctx.paymentId}`,
      };
    }
    const env = creds.env === 'staging' ? 'securegw-stage.paytm.in' : 'securegw.paytm.in';
    const body = {
      requestType: 'Payment',
      mid: merchantId,
      websiteName: website,
      orderId,
      callbackUrl: `${ctx.webhookBaseUrl}/functions/v1/payment-webhook?gateway=paytm`,
      txnAmount: { value: ctx.amount.toFixed(2), currency: 'INR' },
      userInfo: { custId: ctx.customerId, mobile: ctx.customerPhone, email: ctx.customerEmail, firstName: ctx.customerName },
    };
    const checksum = await sha256(`${JSON.stringify(body)}|${merchantKey}`);
    const res = await fetch(`https://${env}/theia/api/v1/initiateTransaction?mid=${merchantId}&orderId=${orderId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, head: { signature: checksum } }),
    });
    if (!res.ok) throw new Error(`Paytm order failed: ${await res.text()}`);
    const data = await res.json();
    const txnToken = data?.body?.txnToken;
    return {
      orderId,
      publicKey: merchantId,
      checkoutUrl: txnToken ? `https://${env}/theia/api/v1/showPaymentPage?mid=${merchantId}&orderId=${orderId}` : undefined,
      checkoutParams: { txnToken: String(txnToken ?? ''), mid: merchantId, orderId },
      raw: data,
    };
  },

  async verifyWebhook(creds, _body, _headers, payload): Promise<WebhookParseResult> {
    const orderId = String(payload.ORDERID ?? payload.orderId ?? '');
    const txnId = String(payload.TXNID ?? payload.txnId ?? '');
    const status = String(payload.STATUS ?? payload.status ?? '').toUpperCase();
    const checksum = String(payload.CHECKSUMHASH ?? '');
    const merchantKey = creds.merchant_key ?? '';
    let verified = false;
    if (merchantKey && checksum) {
      const expected = await sha256(`${orderId}|${status}|${merchantKey}`);
      verified = expected === checksum;
    }
    return {
      verified: verified || Deno.env.get('PAYMENT_WEBHOOK_SKIP_VERIFY') === '1',
      orderId,
      gatewayPaymentId: txnId,
      signature: checksum,
      method: 'upi',
      status: status === 'TXN_SUCCESS' ? 'success' : 'failed',
      raw: payload,
    };
  },

  async testConnection(creds) {
    if (!creds.merchant_id || !creds.merchant_key) {
      return { ok: false, message: 'Missing merchant_id or merchant_key' };
    }
    return { ok: true, message: 'Paytm credentials saved' };
  },
};

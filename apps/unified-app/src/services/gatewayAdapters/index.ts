import type { GatewaySlug } from '@/types/payments';

export type CheckoutBuildInput = {
  gatewaySlug: GatewaySlug;
  keyId: string;
  orderId: string;
  amount: number;
  paymentId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  checkoutUrl?: string | null;
  checkoutParams?: Record<string, string> | null;
};

function postFormHtml(action: string, params: Record<string, string>): string {
  const fields = Object.entries(params)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${escapeHtml(v)}"/>`)
    .join('');
  return `<!DOCTYPE html><html><body onload="document.forms[0].submit()">
    <form method="POST" action="${action}">${fields}</form>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function buildRazorpayHtml(input: CheckoutBuildInput): string {
  const amountPaisa = Math.round(input.amount * 100);
  return `<!DOCTYPE html><html><body>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  var options = {
    key: "${input.keyId}",
    amount: ${amountPaisa},
    currency: "INR",
    order_id: "${input.orderId}",
    name: "Prime Fibernet",
    description: "Broadband Bill Payment",
    prefill: { name: "${input.customerName}", contact: "${input.customerPhone}", email: "${input.customerEmail}" },
    handler: function(response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        success: true,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
      }));
    },
    modal: { ondismiss: function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ success: false, reason: 'dismissed' }));
    }}
  };
  var rzp = new Razorpay(options);
  rzp.open();
</script></body></html>`;
}

export function buildGatewayCheckoutSource(input: CheckoutBuildInput): { html?: string; uri?: string } {
  const { gatewaySlug, checkoutUrl, checkoutParams } = input;

  if (gatewaySlug === 'razorpay') {
    return { html: buildRazorpayHtml(input) };
  }

  if ((gatewaySlug === 'easebuzz' || gatewaySlug === 'payu') && checkoutUrl && checkoutParams) {
    return { html: postFormHtml(checkoutUrl, checkoutParams) };
  }

  if (checkoutUrl) {
    return { uri: checkoutUrl };
  }

  return { html: '<html><body><p>Payment gateway unavailable</p></body></html>' };
}

export function parseWebViewPaymentMessage(data: string): {
  success: boolean;
  reason?: string;
  paymentId?: string;
  orderId?: string;
  signature?: string;
} {
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    return {
      success: Boolean(parsed.success),
      reason: parsed.reason as string | undefined,
      paymentId: (parsed.paymentId as string) ?? undefined,
      orderId: (parsed.razorpay_order_id as string) ?? undefined,
      signature: (parsed.razorpay_signature as string) ?? undefined,
    };
  } catch {
    return { success: false, reason: 'invalid_response' };
  }
}

export function parsePaymentCallbackUrl(url: string): {
  isCallback: boolean;
  success?: boolean;
  paymentId?: string;
  orderId?: string;
} {
  const lower = url.toLowerCase();

  if (lower.includes('verify-payment')) {
    try {
      const parsed = new URL(url);
      const paymentId = parsed.searchParams.get('paymentId') ?? undefined;
      const dev = parsed.searchParams.get('dev');
      return {
        isCallback: true,
        success: dev === '1' || parsed.searchParams.get('status') === 'success',
        paymentId,
        orderId: parsed.searchParams.get('orderId') ?? undefined,
      };
    } catch {
      return { isCallback: true, success: true };
    }
  }

  if (lower.includes('payment-webhook')) {
    return { isCallback: true, success: true };
  }

  if (lower.includes('payment_success') || lower.includes('razorpay_payment_id')) {
    return { isCallback: true, success: true };
  }

  if (lower.includes('payment_failed') || lower.includes('/cancel')) {
    return { isCallback: true, success: false };
  }

  return { isCallback: false };
}

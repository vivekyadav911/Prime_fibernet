import type { PaymentGateway } from '@prime/types';

import { store } from '@/store/store';
import { paymentsApi } from '@/services/api/paymentsApi';

export type RazorpayUserInfo = {
  userId: string;
  name: string;
  email: string;
  phone?: string;
};

export type RazorpayOrderResult = {
  paymentId: string;
  orderId: string;
  checkoutUrl: string | null;
  gateway: PaymentGateway;
  amount: number;
};

export type RazorpayPaymentResult = {
  success: boolean;
  paymentId: string;
  orderId: string;
  gatewayResponse?: Record<string, unknown>;
};

type WebViewBridge = {
  loadHtml: (html: string) => void;
  onMessage: (handler: (data: RazorpayPaymentResult) => void) => () => void;
};

const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '';

function buildRazorpayCheckoutHtml(
  orderId: string,
  amountInr: number,
  user: RazorpayUserInfo,
  paymentId: string,
  keyId: string,
): string {
  const prefill = JSON.stringify({
    name: user.name,
    email: user.email,
    contact: user.phone ?? '',
  });

  return `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  function post(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }
  var options = {
    key: ${JSON.stringify(keyId)},
    order_id: ${JSON.stringify(orderId)},
    amount: ${Math.round(amountInr * 100)},
    currency: 'INR',
    name: 'Prime Fibernet',
    description: 'Internet plan payment',
    prefill: ${prefill},
    handler: function (response) {
      post({ success: true, paymentId: ${JSON.stringify(paymentId)}, orderId: ${JSON.stringify(orderId)}, gatewayResponse: response });
    },
    modal: {
      ondismiss: function () {
        post({ success: false, paymentId: ${JSON.stringify(paymentId)}, orderId: ${JSON.stringify(orderId)} });
      }
    }
  };
  try {
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function (resp) {
      post({ success: false, paymentId: ${JSON.stringify(paymentId)}, orderId: ${JSON.stringify(orderId)}, gatewayResponse: resp });
    });
    rzp.open();
  } catch (e) {
    post({ success: false, paymentId: ${JSON.stringify(paymentId)}, orderId: ${JSON.stringify(orderId)}, gatewayResponse: { error: String(e) } });
  }
</script>
</body>
</html>`;
}

/** Calls `create-payment-order` edge function (Razorpay branch when gateway is razorpay). */
export async function createOrder(
  planId: string,
  amount: number,
  user: RazorpayUserInfo,
  planName: string,
): Promise<RazorpayOrderResult> {
  const res = await store
    .dispatch(
      paymentsApi.endpoints.createPaymentOrder.initiate({
        userId: user.userId,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
        planId,
        planName,
        amount,
      }),
    )
    .unwrap();

  const gateway = (res.gateway ?? 'razorpay') as PaymentGateway;
  return {
    paymentId: res.paymentId,
    orderId: res.orderId,
    checkoutUrl: res.checkoutUrl,
    gateway,
    amount: res.amount,
  };
}

/**
 * Opens Razorpay checkout in a WebView bridge.
 * On completion, verifies payment and invalidates RTK Query caches.
 */
export function openGateway(
  order: RazorpayOrderResult,
  user: RazorpayUserInfo,
  bridge: WebViewBridge,
): Promise<RazorpayPaymentResult> {
  return new Promise((resolve, reject) => {
    const keyId = RAZORPAY_KEY_ID;
    if (!keyId && !order.checkoutUrl) {
      reject(new Error('EXPO_PUBLIC_RAZORPAY_KEY_ID is required for Razorpay checkout'));
      return;
    }

    const unsubscribe = bridge.onMessage(async (result) => {
      unsubscribe();
      try {
        if (result.success) {
          await store
            .dispatch(
              paymentsApi.endpoints.verifyPayment.initiate({
                paymentId: result.paymentId,
                orderId: result.orderId,
                gateway: 'razorpay',
                paymentResponse: { success: true, detailed_response: result.gatewayResponse },
              }),
            )
            .unwrap();
          store.dispatch(paymentsApi.util.invalidateTags(['Payments', 'Subscriptions']));
        }
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });

    if (keyId) {
      bridge.loadHtml(
        buildRazorpayCheckoutHtml(order.orderId, order.amount, user, order.paymentId, keyId),
      );
      return;
    }

    if (order.checkoutUrl) {
      bridge.loadHtml(
        `<!DOCTYPE html><html><body><script>location.href=${JSON.stringify(order.checkoutUrl)}</script></body></html>`,
      );
      return;
    }

    unsubscribe();
    reject(new Error('No Razorpay checkout URL available'));
  });
}

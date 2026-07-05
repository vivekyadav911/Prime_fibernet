import type { RazorpayCheckoutCallbacks, RazorpayCheckoutOptions } from './types';

type RazorpayWebInstance = {
  open: () => void;
  on: (event: string, handler: (response: { error: { description?: string } }) => void) => void;
};

type RazorpayWebConstructor = new (options: Record<string, unknown>) => RazorpayWebInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayWebConstructor;
  }
}

const CHECKOUT_SCRIPT_ID = 'razorpay-checkout-js';
const CHECKOUT_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptLoadPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Document is not available.'));
  }

  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(CHECKOUT_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay checkout.')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.id = CHECKOUT_SCRIPT_ID;
    script.src = CHECKOUT_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout.'));
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

export async function openWebCheckout(
  options: RazorpayCheckoutOptions,
  callbacks: RazorpayCheckoutCallbacks,
): Promise<void> {
  await loadCheckoutScript();

  if (!window.Razorpay) {
    throw new Error('Razorpay checkout script did not initialize.');
  }

  const rzp = new window.Razorpay({
    key: options.key,
    amount: options.amount,
    currency: options.currency,
    order_id: options.order_id,
    name: options.name,
    description: options.description,
    image: options.image,
    prefill: options.prefill,
    theme: options.theme,
    handler: (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => {
      callbacks.onSuccess(response);
    },
    modal: {
      confirm_close: options.modal?.confirm_close,
      animation: options.modal?.animation,
      ondismiss: () => {
        callbacks.onClose?.();
      },
    },
  });

  rzp.on('payment.failed', (response) => {
    callbacks.onFailure({
      description: response.error?.description ?? 'Payment failed.',
    });
  });

  rzp.open();
}

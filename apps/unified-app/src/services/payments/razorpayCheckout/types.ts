export type RazorpayCheckoutMode = 'native' | 'webview' | 'web_js';

export type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type RazorpayFailurePayload = {
  code?: string;
  description?: string;
};

export type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: { color?: string };
  modal?: {
    confirm_close?: boolean;
    animation?: boolean;
  };
};

export type RazorpayCheckoutCallbacks = {
  onSuccess: (data: RazorpaySuccessPayload) => void;
  onFailure: (error: RazorpayFailurePayload) => void;
  onClose?: () => void;
};

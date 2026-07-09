import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useRazorpay } from '@codearcade/expo-razorpay';

import {
  NativeRazorpayUnavailableError,
  openNativeCheckout,
  shouldUseNativeRazorpay,
} from './nativeCheckout';
import type { RazorpayCheckoutCallbacks, RazorpayCheckoutMode, RazorpayCheckoutOptions } from './types';
import { openWebCheckout } from './webCheckout';

export type { RazorpayCheckoutCallbacks, RazorpayCheckoutMode, RazorpayCheckoutOptions } from './types';

export function useRazorpayCheckout() {
  const { openCheckout: openWebViewCheckout, RazorpayUI } = useRazorpay();
  const [activeMode, setActiveMode] = useState<RazorpayCheckoutMode | null>(null);

  const openWebView = useCallback(
    (options: RazorpayCheckoutOptions, callbacks: RazorpayCheckoutCallbacks) => {
      setActiveMode('webview');
      openWebViewCheckout(
        {
          key: options.key,
          amount: options.amount,
          currency: options.currency,
          order_id: options.order_id,
          name: options.name,
          description: options.description,
          image: options.image,
          prefill: options.prefill,
          theme: options.theme,
          modal: options.modal,
        },
        {
          onSuccess: (data) => {
            setActiveMode(null);
            callbacks.onSuccess(data);
          },
          onFailure: (error) => {
            setActiveMode(null);
            callbacks.onFailure({
              code: error.code,
              description: error.description,
            });
          },
          onClose: () => {
            setActiveMode(null);
            callbacks.onClose?.();
          },
        },
      );
    },
    [openWebViewCheckout],
  );

  const openCheckout = useCallback(
    (options: RazorpayCheckoutOptions, callbacks: RazorpayCheckoutCallbacks) => {
      // Server returns an empty key and a fake `dev_razorpay_*` order when the
      // gateway row has no credentials — Razorpay checkout would hang forever.
      if (!options.key || options.order_id.startsWith('dev_')) {
        callbacks.onFailure({
          code: 'GATEWAY_NOT_CONFIGURED',
          description:
            'Razorpay is not fully configured (missing API keys). Add the Razorpay Key ID and Key Secret in Admin → Payment Gateway settings, then try again.',
        });
        return;
      }

      const useNative = shouldUseNativeRazorpay();
      if (Platform.OS === 'web') {
        setActiveMode('web_js');
        void openWebCheckout(options, {
          onSuccess: (data) => {
            setActiveMode(null);
            callbacks.onSuccess(data);
          },
          onFailure: (error) => {
            setActiveMode(null);
            callbacks.onFailure(error);
          },
          onClose: () => {
            setActiveMode(null);
            callbacks.onClose?.();
          },
        }).catch((err: unknown) => {
          setActiveMode(null);
          callbacks.onFailure({
            description:
              err instanceof Error ? err.message : 'Could not open Razorpay checkout on web.',
          });
        });
        return;
      }

      if (useNative) {
        setActiveMode('native');
        void openNativeCheckout(options, {
          onSuccess: (data) => {
            setActiveMode(null);
            callbacks.onSuccess(data);
          },
          onFailure: (error) => {
            setActiveMode(null);
            callbacks.onFailure(error);
          },
          onClose: () => {
            setActiveMode(null);
            callbacks.onClose?.();
          },
        }).catch((err: unknown) => {
          if (err instanceof NativeRazorpayUnavailableError) {
            openWebView(options, callbacks);
            return;
          }
          setActiveMode(null);
          callbacks.onFailure({
            description: err instanceof Error ? err.message : 'Could not open Razorpay checkout.',
          });
        });
        return;
      }

      openWebView(options, callbacks);
    },
    [openWebView],
  );

  return {
    openCheckout,
    RazorpayUI,
    activeMode,
  };
}

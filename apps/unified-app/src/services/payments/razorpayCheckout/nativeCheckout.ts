import { NativeModules, Platform } from 'react-native';

import { isExpoGo } from '@/utils/expoRuntime';

import type { RazorpayCheckoutCallbacks, RazorpayCheckoutOptions, RazorpayFailurePayload } from './types';

export class NativeRazorpayUnavailableError extends Error {
  constructor(message = 'Native Razorpay module is not available') {
    super(message);
    this.name = 'NativeRazorpayUnavailableError';
  }
}

type NativeRazorpayModule = {
  open: (options: RazorpayCheckoutOptions) => Promise<RazorpaySuccessPayload>;
};

type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

let cachedModule: NativeRazorpayModule | null | undefined;

function getRazorpayModule(): NativeRazorpayModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }

  try {
    if (!NativeModules.RNRazorpayCheckout) {
      cachedModule = null;
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('react-native-razorpay').default as NativeRazorpayModule;
  } catch {
    cachedModule = null;
  }

  return cachedModule;
}

function normalizeNativeError(err: unknown): RazorpayFailurePayload {
  if (typeof err === 'object' && err !== null) {
    const record = err as Record<string, unknown>;
    const nested = record.error;

    if (typeof nested === 'object' && nested !== null) {
      const errorObj = nested as Record<string, unknown>;
      return {
        code: typeof errorObj.code === 'string' ? errorObj.code : undefined,
        description:
          typeof errorObj.description === 'string'
            ? errorObj.description
            : typeof errorObj.reason === 'string'
              ? errorObj.reason
              : undefined,
      };
    }

    return {
      code: typeof record.code === 'string' ? record.code : undefined,
      description:
        typeof record.description === 'string'
          ? record.description
          : typeof record.message === 'string'
            ? record.message
            : undefined,
    };
  }

  if (typeof err === 'string') {
    return { description: err };
  }

  return { description: 'Payment could not be completed.' };
}

function isModuleInvocationError(error: RazorpayFailurePayload): boolean {
  const description = (error.description ?? '').toLowerCase();
  return (
    description.includes('null is not an object') ||
    description.includes('undefined is not an object') ||
    description.includes('cannot read property') ||
    description.includes('native module') ||
    description.includes('not linked')
  );
}

function isUserDismissed(error: RazorpayFailurePayload): boolean {
  const code = (error.code ?? '').toLowerCase();
  const description = (error.description ?? '').toLowerCase();
  return (
    code === '0' ||
    code === 'payment_cancelled' ||
    description.includes('cancelled') ||
    description.includes('canceled') ||
    description.includes('dismissed')
  );
}

export function isNativeRazorpayAvailable(): boolean {
  return getRazorpayModule() != null;
}

export function shouldUseNativeRazorpay(): boolean {
  if (Platform.OS === 'web') return false;
  if (isExpoGo()) return false;
  return isNativeRazorpayAvailable();
}

export async function openNativeCheckout(
  options: RazorpayCheckoutOptions,
  callbacks: RazorpayCheckoutCallbacks,
): Promise<void> {
  const module = getRazorpayModule();
  if (!module) {
    throw new NativeRazorpayUnavailableError();
  }

  try {
    const result = await module.open(options);
    callbacks.onSuccess({
      razorpay_payment_id: result.razorpay_payment_id,
      razorpay_order_id: result.razorpay_order_id,
      razorpay_signature: result.razorpay_signature,
    });
  } catch (err: unknown) {
    const error = normalizeNativeError(err);
    if (isModuleInvocationError(error)) {
      throw new NativeRazorpayUnavailableError(error.description);
    }
    if (isUserDismissed(error)) {
      callbacks.onClose?.();
      return;
    }
    callbacks.onFailure(error);
  }
}

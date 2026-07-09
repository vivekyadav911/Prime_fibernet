type PostgrestError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

/** Log full Supabase/PostgREST error and return an officer-facing message. */
export function formatSupabaseRpcError(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const err = error as PostgrestError;
  console.error('[Supabase RPC error]', {
    code: err.code,
    message: err.message,
    details: err.details,
    hint: err.hint,
  });

  const message = err.message?.trim();
  if (!message) return fallback;

  if (message.includes('Reference is required')) {
    return 'Transaction reference is required for this payment method.';
  }
  if (message.includes('UPI transaction reference is required')) {
    return 'Enter the UPI transaction reference from the customer’s payment confirmation.';
  }
  if (message.includes('not authorized')) {
    return 'You are not authorized to collect from this customer.';
  }
  if (message.includes('Invalid verification_method')) {
    return 'Invalid payment verification method. Contact support.';
  }
  if (message.includes('invalid input value for enum')) {
    return 'Unsupported payment method for this flow.';
  }
  if (message.includes('verification_method_check') || message.includes('verification_method')) {
    return 'Payment verification method is not supported. Update the app or contact support.';
  }

  return message;
}

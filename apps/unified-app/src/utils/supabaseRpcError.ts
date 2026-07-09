type PostgrestError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function mapKnownRpcMessage(message: string): string {
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

/** Log full Supabase/PostgREST error and return an officer-facing message. */
export function formatSupabaseRpcError(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === 'string' && error.trim()) return error.trim();

  if (error instanceof Error && error.message.trim()) {
    console.error('[Supabase RPC error]', { name: error.name, message: error.message });
    return mapKnownRpcMessage(error.message.trim());
  }

  if (typeof error === 'object') {
    const err = error as PostgrestError & { error?: string; status?: string | number };
    const message =
      err.message?.trim() ||
      (typeof err.error === 'string' ? err.error.trim() : '') ||
      (typeof err.details === 'string' ? err.details.trim() : '');

    console.error('[Supabase RPC error]', {
      code: err.code,
      message: err.message,
      details: err.details,
      hint: err.hint,
      status: err.status,
      error: err.error,
    });

    if (message) return mapKnownRpcMessage(message);
  }

  return fallback;
}

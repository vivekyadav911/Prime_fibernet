type FunctionLikeError = {
  name?: string;
  message?: string;
  context?: unknown;
};

function sanitizeFunctionMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;
  return trimmed.replace(/^[A-Z0-9_]+:\s*/, '');
}

function readErrorField(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  if ('error' in body && typeof (body as { error: unknown }).error === 'string') {
    const msg = (body as { error: string }).error.trim();
    return msg ? sanitizeFunctionMessage(msg) : null;
  }
  if ('message' in body && typeof (body as { message: unknown }).message === 'string') {
    const msg = (body as { message: string }).message.trim();
    return msg ? sanitizeFunctionMessage(msg) : null;
  }
  return null;
}

/** Extract a user-facing message from Supabase Edge Function invoke errors. */
export async function parseSupabaseFunctionError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): Promise<string> {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  const fnError = error as FunctionLikeError;
  const context = fnError.context;

  if (context && typeof context === 'object' && 'json' in context && typeof context.json === 'function') {
    try {
      const body = await (context as Response).json();
      const parsed = readErrorField(body);
      if (parsed) return parsed;
    } catch {
      // Fall through to message-based parsing.
    }
  }

  if (fnError.name === 'FunctionsHttpError' && context && typeof context === 'object' && 'text' in context) {
    try {
      const bodyText = await (context as Response).text();
      if (bodyText.trim()) {
        try {
          const parsed = readErrorField(JSON.parse(bodyText));
          if (parsed) return parsed;
        } catch {
          return sanitizeFunctionMessage(bodyText);
        }
      }
    } catch {
      // Fall through.
    }
  }

  if (typeof fnError.message === 'string' && fnError.message.trim()) {
    if (fnError.message !== 'Edge Function returned a non-2xx status code') {
      return sanitizeFunctionMessage(fnError.message);
    }
  }

  return fallback;
}

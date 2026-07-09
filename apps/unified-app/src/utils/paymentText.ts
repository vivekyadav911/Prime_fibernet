/** Coerce payment metadata fields to display-safe strings. */
export function paymentText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

export function hasPaymentText(value: unknown): boolean {
  const text = paymentText(value);
  return Boolean(text && text.trim());
}

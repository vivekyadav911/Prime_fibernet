/**
 * Formats customer identity for payment/collection UI without dangling separators.
 */
export function formatPaymentCustomerLine(parts: {
  name?: string | null;
  accountNumber?: string | null;
  phone?: string | null;
  customerId?: string | null;
}): string {
  const name = parts.name?.trim() || 'Customer';
  const secondary =
    parts.accountNumber?.trim() ||
    parts.customerId?.trim() ||
    parts.phone?.trim() ||
    null;
  return secondary ? `${name} · ${secondary}` : name;
}

/** Display account number from DB (`users.customer_id`) with PFN fallback. */
export function formatCustomerAccountId(
  customerId: string | null | undefined,
  fallbackUserId?: string,
): string {
  const trimmed = customerId?.trim();
  if (trimmed) return trimmed;
  if (fallbackUserId) {
    return `PFN-${fallbackUserId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }
  return '—';
}

/** Compose installation address from user row fields. */
export function formatInstallationAddress(user: Record<string, unknown> | null | undefined): string {
  if (!user) return '';

  const line = typeof user.address === 'string' ? user.address.trim() : '';
  const city = typeof user.city === 'string' ? user.city.trim() : '';
  const district = typeof user.district === 'string' ? user.district.trim() : '';
  const pincode = typeof user.pincode === 'string' ? user.pincode.trim() : '';

  const locality = [city, district].filter(Boolean).join(', ');
  const tail = [locality, pincode].filter(Boolean).join(' — ');

  if (line && tail) return `${line}, ${tail}`;
  return line || tail;
}

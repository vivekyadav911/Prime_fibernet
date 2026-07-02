/**
 * Canonical officer display name — prefer officers.full_name over users.name or denormalized copies.
 */
export function resolveOfficerName(
  officerId: string | null | undefined,
  options: {
    fullName?: string | null;
    userName?: string | null;
    denormalizedName?: string | null;
    email?: string | null;
    context?: string;
  } = {},
): string | null {
  if (!officerId) return null;

  const full = options.fullName?.trim();
  if (full) return full;

  const user = options.userName?.trim();
  if (user) return user;

  const denorm = options.denormalizedName?.trim();
  if (denorm) return denorm;

  const email = options.email?.trim();
  if (email) return email;

  if (__DEV__) {
    console.warn(
      `[support] Officer name unresolved for officer_id=${officerId}${options.context ? ` in ${options.context}` : ''}`,
    );
  }
  return 'Officer';
}

export function officerDisplayInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
}

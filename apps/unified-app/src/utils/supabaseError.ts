type PostgresLikeError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

/** User-facing message from Supabase PostgREST / Postgres errors. */
export function formatSupabaseError(error: unknown, fallback = 'Request failed'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error && error.message.trim()) return error.message;

  if (error && typeof error === 'object') {
    const pg = error as PostgresLikeError;
    const parts = [pg.message, pg.details, pg.hint].filter(
      (part): part is string => typeof part === 'string' && part.trim().length > 0,
    );
    if (parts.length > 0) return parts.join(' — ');
    if (pg.code) return `${fallback} (${pg.code})`;
  }

  return fallback;
}

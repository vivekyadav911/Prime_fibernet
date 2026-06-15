/** Extract a user-facing message from RTK Query / Supabase errors. */
export function queryErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;

  if (typeof error === 'string') return error;

  if (error && typeof error === 'object') {
    if ('error' in error && typeof (error as { error: unknown }).error === 'string') {
      const msg = (error as { error: string }).error;
      if (msg.trim()) return msg;
    }
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
    if ('data' in error) {
      const data = (error as { data: unknown }).data;
      if (data && typeof data === 'object' && 'message' in data) {
        return String((data as { message: unknown }).message);
      }
      if (typeof data === 'string' && data.trim()) return data;
    }
  }
  return fallback;
}

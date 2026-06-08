/** Extract a user-facing message from RTK Query / Supabase errors. */
export function queryErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error && typeof error === 'object') {
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
    if ('data' in error) {
      const data = (error as { data: unknown }).data;
      if (data && typeof data === 'object' && 'message' in data) {
        return String((data as { message: unknown }).message);
      }
    }
  }
  return fallback;
}

import { format, formatDistanceToNow } from 'date-fns';

export function formatDateIst(iso: string, pattern = 'd MMM yyyy'): string {
  return format(new Date(iso), pattern);
}

export function formatRelativeIst(iso: string): string {
  const date = new Date(iso);
  const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 1) return format(date, 'd MMM yyyy');
  return formatDistanceToNow(date, { addSuffix: true });
}

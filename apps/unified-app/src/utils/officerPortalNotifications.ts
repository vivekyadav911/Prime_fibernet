import type { NotificationCategory, PortalNotification } from '@/types/payments';

import {
  isJunkPortalNotification,
  portalNotificationCategoryLabel,
  resolveNotificationText,
} from '@/utils/portalNotificationDisplay';

export type OfficerNotificationCategoryFilter = 'all' | 'hr' | 'payment' | 'ticket' | 'system';
export type OfficerNotificationReadFilter = 'all' | 'unread' | 'read';
export type OfficerNotificationSortKey = 'newest' | 'oldest' | 'unread_first';
export type OfficerNotificationDatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

export type OfficerNotificationFilterState = {
  categoryFilter: OfficerNotificationCategoryFilter;
  readFilter: OfficerNotificationReadFilter;
  sortKey: OfficerNotificationSortKey;
  dateFrom: string;
  dateTo: string;
};

export const DEFAULT_OFFICER_NOTIFICATION_FILTERS: OfficerNotificationFilterState = {
  categoryFilter: 'all',
  readFilter: 'all',
  sortKey: 'newest',
  dateFrom: '',
  dateTo: '',
};

export const OFFICER_NOTIFICATION_CATEGORY_FILTERS: Array<{
  key: OfficerNotificationCategoryFilter;
  label: string;
}> = [
  { key: 'all', label: 'All' },
  { key: 'hr', label: 'HR' },
  { key: 'payment', label: 'Payments' },
  { key: 'ticket', label: 'Tickets' },
  { key: 'system', label: 'System' },
];

export const OFFICER_NOTIFICATION_READ_FILTERS: Array<{
  key: OfficerNotificationReadFilter;
  label: string;
}> = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

export const OFFICER_NOTIFICATION_SORT_OPTIONS: Array<{
  key: OfficerNotificationSortKey;
  label: string;
}> = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'unread_first', label: 'Unread first' },
];

export const OFFICER_NOTIFICATION_DATE_PRESETS: Array<{
  key: OfficerNotificationDatePreset;
  label: string;
}> = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'custom', label: 'Custom range' },
];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function officerNotificationDatePresetRange(
  preset: Exclude<OfficerNotificationDatePreset, 'custom'>,
): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const to = isoDate(today);
  if (preset === 'all') return { dateFrom: '', dateTo: '' };
  if (preset === 'today') return { dateFrom: to, dateTo: to };
  if (preset === 'week') {
    const from = new Date(today);
    from.setDate(from.getDate() - 7);
    return { dateFrom: isoDate(from), dateTo: to };
  }
  const from = new Date(today);
  from.setMonth(from.getMonth() - 1);
  return { dateFrom: isoDate(from), dateTo: to };
}

export function detectOfficerNotificationDatePreset(
  dateFrom: string,
  dateTo: string,
): OfficerNotificationDatePreset {
  if (!dateFrom && !dateTo) return 'all';
  for (const preset of ['today', 'week', 'month'] as const) {
    const range = officerNotificationDatePresetRange(preset);
    if (range.dateFrom === dateFrom && range.dateTo === dateTo) return preset;
  }
  return 'custom';
}

export function formatOfficerNotificationDateLabel(dateFrom: string, dateTo: string): string {
  if (!dateFrom && !dateTo) return 'All dates';
  const fmt = (value: string) => {
    const d = new Date(`${value}T12:00:00`);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  if (dateFrom && dateTo) return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
  if (dateFrom) return `From ${fmt(dateFrom)}`;
  return `Until ${fmt(dateTo)}`;
}

export function countActiveOfficerNotificationFilters(
  filters: OfficerNotificationFilterState,
  searchQuery: string,
): number {
  let count = 0;
  if (filters.categoryFilter !== 'all') count += 1;
  if (filters.readFilter !== 'all') count += 1;
  if (filters.sortKey !== 'newest') count += 1;
  if (filters.dateFrom || filters.dateTo) count += 1;
  if (searchQuery.trim()) count += 1;
  return count;
}

function matchesCategory(
  item: PortalNotification,
  categoryFilter: OfficerNotificationCategoryFilter,
): boolean {
  if (categoryFilter === 'all') return true;
  if (categoryFilter === 'ticket') {
    return item.category === 'ticket' || item.category === 'request';
  }
  return item.category === categoryFilter;
}

export function applyOfficerPortalNotificationFilters(
  notifications: PortalNotification[],
  filters: OfficerNotificationFilterState & { searchQuery: string },
): PortalNotification[] {
  let list = notifications.filter((n) => !isJunkPortalNotification(n));

  list = list.filter((n) => matchesCategory(n, filters.categoryFilter));

  if (filters.readFilter === 'unread') {
    list = list.filter((n) => !n.is_read);
  } else if (filters.readFilter === 'read') {
    list = list.filter((n) => n.is_read);
  }

  if (filters.dateFrom) {
    const start = new Date(`${filters.dateFrom}T00:00:00`);
    const startMs = start.getTime();
    list = list.filter((n) => new Date(n.created_at).getTime() >= startMs);
  }
  if (filters.dateTo) {
    const end = new Date(`${filters.dateTo}T23:59:59.999`);
    const endMs = end.getTime();
    list = list.filter((n) => new Date(n.created_at).getTime() <= endMs);
  }

  const q = filters.searchQuery.trim().toLowerCase();
  if (q) {
    list = list.filter((n) => {
      const title = resolveNotificationText(n.title, n.data).toLowerCase();
      const body = resolveNotificationText(n.body, n.data).toLowerCase();
      const category = portalNotificationCategoryLabel(n.category).toLowerCase();
      const type = String(n.type ?? '').toLowerCase();
      return title.includes(q) || body.includes(q) || category.includes(q) || type.includes(q);
    });
  }

  const sorted = [...list];
  sorted.sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    if (filters.sortKey === 'unread_first') {
      if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
      return timeB - timeA;
    }
    if (filters.sortKey === 'oldest') return timeA - timeB;
    return timeB - timeA;
  });

  return sorted;
}

export function officerNotificationEmptySubtitle(
  filters: OfficerNotificationFilterState & { searchQuery: string },
  hasAnyNotifications: boolean,
): string {
  if (!hasAnyNotifications) {
    return 'Employment contract signatures, collection assignments, and payment alerts appear here.';
  }
  if (filters.searchQuery.trim()) {
    return 'Try a different search term or clear filters.';
  }
  if (filters.readFilter === 'unread') {
    return 'You have read all notifications in this view.';
  }
  if (
    filters.categoryFilter !== 'all' ||
    filters.dateFrom ||
    filters.dateTo
  ) {
    return 'Try another filter or date range.';
  }
  return 'No notifications match the current filters.';
}

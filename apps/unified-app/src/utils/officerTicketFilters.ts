import type { PortalStatusBucket, PortalTicketItem } from '@/types/portalTicket';

/** Officer list filter tabs — mapped to canonical Ticket Portal status buckets. */
export type OfficerTicketFilterKey = 'all' | 'new' | 'active' | 'done';

export const OFFICER_TICKET_FILTERS: Array<{ key: OfficerTicketFilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'active', label: 'Active' },
  { key: 'done', label: 'Done' },
];

const NEW_BUCKETS: ReadonlySet<PortalStatusBucket> = new Set(['Open', 'Reopened']);
const ACTIVE_BUCKETS: ReadonlySet<PortalStatusBucket> = new Set([
  'In Progress',
  'Awaiting Customer',
  'Awaiting Parts',
]);
const DONE_BUCKETS: ReadonlySet<PortalStatusBucket> = new Set(['Resolved', 'Closed']);

/**
 * Officer "New" = admin Ticket Portal Open + Reopened.
 * Officer "Active" = In Progress + Awaiting Customer + Awaiting Parts.
 * Officer "Done" = Resolved + Closed.
 */
export function matchesOfficerTicketFilter(
  item: PortalTicketItem,
  filter: OfficerTicketFilterKey,
): boolean {
  if (filter === 'all') return true;
  const bucket = item.statusBucket;
  if (filter === 'new') return NEW_BUCKETS.has(bucket);
  if (filter === 'active') return ACTIVE_BUCKETS.has(bucket);
  if (filter === 'done') return DONE_BUCKETS.has(bucket);
  return true;
}

export function officerTicketPriorityRank(item: PortalTicketItem): number {
  const order: Record<string, number> = {
    Critical: 0,
    High: 1,
    Medium: 2,
    Low: 3,
    P0: 0,
    P1: 1,
    P2: 2,
    P3: 3,
  };
  if (item.priority) return order[item.priority] ?? 9;
  return 9;
}

function parsePortalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isCalendarToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** Assigned or created on the officer's local calendar day. */
export function isPortalItemAssignedToday(item: PortalTicketItem): boolean {
  const assigned = parsePortalDate(item.assignedAt);
  if (assigned && isCalendarToday(assigned)) return true;
  const created = parsePortalDate(item.createdAt);
  return created !== null && isCalendarToday(created);
}

/** Open, reopened, or in-progress work — excludes resolved/closed. */
export function isPortalItemOpenActive(item: PortalTicketItem): boolean {
  return matchesOfficerTicketFilter(item, 'new') || matchesOfficerTicketFilter(item, 'active');
}

/** Lower rank surfaces first in Today's Assignments. */
export function officerTicketStatusRank(item: PortalTicketItem): number {
  if (matchesOfficerTicketFilter(item, 'new')) return 0;
  if (item.statusBucket === 'In Progress') return 1;
  if (matchesOfficerTicketFilter(item, 'active')) return 2;
  return 9;
}

function portalItemRecencyTimestamp(item: PortalTicketItem): number {
  return Date.parse(item.assignedAt ?? item.createdAt) || 0;
}

/** Up to `limit` open/active items assigned or created today, most urgent first. */
export function selectTodayAssignmentPreview(
  items: PortalTicketItem[],
  limit = 3,
): PortalTicketItem[] {
  return items
    .filter((item) => isPortalItemOpenActive(item) && isPortalItemAssignedToday(item))
    .sort((a, b) => {
      const statusDiff = officerTicketStatusRank(a) - officerTicketStatusRank(b);
      if (statusDiff !== 0) return statusDiff;
      const timeDiff = portalItemRecencyTimestamp(b) - portalItemRecencyTimestamp(a);
      if (timeDiff !== 0) return timeDiff;
      return officerTicketPriorityRank(a) - officerTicketPriorityRank(b);
    })
    .slice(0, limit);
}

export type OfficerTicketSortKey = 'newest' | 'oldest' | 'priority' | 'status';
export type OfficerTicketDateFilterKey = 'all' | 'today' | 'week';

export const OFFICER_TICKET_SORT_OPTIONS: Array<{ key: OfficerTicketSortKey; label: string }> = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
];

export const OFFICER_TICKET_DATE_FILTERS: Array<{ key: OfficerTicketDateFilterKey; label: string }> = [
  { key: 'all', label: 'All dates' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
];

function portalItemActivityTimestamp(item: PortalTicketItem): number {
  return Date.parse(item.assignedAt ?? item.createdAt) || 0;
}

export function isPortalItemInDateFilter(
  item: PortalTicketItem,
  dateFilter: OfficerTicketDateFilterKey,
): boolean {
  if (dateFilter === 'all') return true;
  if (dateFilter === 'today') return isPortalItemAssignedToday(item);
  const ts = portalItemActivityTimestamp(item);
  if (!ts) return false;
  return ts >= Date.now() - 7 * 86_400_000;
}

function matchesOfficerTicketSearch(item: PortalTicketItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    item.displayNumber,
    item.categoryLabel,
    item.customerName,
    item.customerAddress,
    item.planName,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function applyOfficerTicketListFilters(
  items: PortalTicketItem[],
  opts: {
    statusFilter: OfficerTicketFilterKey;
    dateFilter: OfficerTicketDateFilterKey;
    sortBy: OfficerTicketSortKey;
    searchQuery: string;
  },
): PortalTicketItem[] {
  const result = items.filter(
    (item) =>
      matchesOfficerTicketFilter(item, opts.statusFilter) &&
      isPortalItemInDateFilter(item, opts.dateFilter) &&
      matchesOfficerTicketSearch(item, opts.searchQuery),
  );

  return result.sort((a, b) => {
    switch (opts.sortBy) {
      case 'oldest':
        return portalItemActivityTimestamp(a) - portalItemActivityTimestamp(b);
      case 'priority': {
        const priorityDiff = officerTicketPriorityRank(a) - officerTicketPriorityRank(b);
        return priorityDiff !== 0
          ? priorityDiff
          : portalItemActivityTimestamp(b) - portalItemActivityTimestamp(a);
      }
      case 'status': {
        const statusDiff = officerTicketStatusRank(a) - officerTicketStatusRank(b);
        return statusDiff !== 0
          ? statusDiff
          : portalItemActivityTimestamp(b) - portalItemActivityTimestamp(a);
      }
      case 'newest':
      default:
        return portalItemActivityTimestamp(b) - portalItemActivityTimestamp(a);
    }
  });
}

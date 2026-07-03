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

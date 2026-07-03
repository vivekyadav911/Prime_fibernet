import type { PortalItemSource, PortalStatusBucket, PortalTicketFilters, PortalTicketItem } from '@/types/portalTicket';
import type { RequestStatus, ServiceRequest } from '@/types/requests';
import type { Ticket, TicketPriority } from '@/types/tickets';
import { formatRequestTypeLabel } from '@/constants/requestTypes';
import { isOpenTicketSlaBreached } from '@/utils/slaUtils';

const REQUEST_STATUS_TO_BUCKET: Record<RequestStatus, PortalStatusBucket> = {
  Pending: 'Open',
  'In Progress': 'In Progress',
  Completed: 'Resolved',
  Cancelled: 'Closed',
};

export function mapTicketSource(source: string): PortalItemSource {
  const normalized = source.toLowerCase();
  if (normalized === 'portal' || normalized === 'customer') return 'customer';
  if (normalized === 'officer' || normalized === 'field') return 'officer';
  return 'admin';
}

export function mapRequestSource(request: ServiceRequest): PortalItemSource {
  if (request.source === 'admin') return 'admin';
  const raw = String((request as ServiceRequest & { raisedBy?: string }).raisedBy ?? request.source);
  if (raw.toLowerCase() === 'officer') return 'officer';
  return 'customer';
}

export function ticketToPortalItem(ticket: Ticket): PortalTicketItem {
  return {
    id: ticket.id,
    kind: 'ticket',
    ticketId: ticket.id,
    requestId: ticket.linkedRequestId,
    displayNumber: ticket.ticketNumber,
    categoryLabel: ticket.complaintType,
    statusBucket: ticket.status,
    source: mapTicketSource(ticket.source),
    customerName: ticket.contactName,
    customerAddress: ticket.address,
    planName: ticket.accountNumber ? `Acct ${ticket.accountNumber}` : '—',
    priority: ticket.priority,
    assignedOfficerId: ticket.assignedOfficerId,
    assignedOfficerName: ticket.assignedOfficerName,
    assignedOfficerRole: ticket.assignedOfficerRole,
    createdAt: ticket.createdAt.toISOString(),
    assignedAt: ticket.assignedAt?.toISOString() ?? null,
    slaBreached: isOpenTicketSlaBreached(ticket),
    ticket,
    request: null,
  };
}

export function requestToPortalItem(request: ServiceRequest): PortalTicketItem {
  return {
    id: request.id,
    kind: 'request',
    ticketId: request.linkedTicketId ?? null,
    requestId: request.id,
    displayNumber: request.requestNumber,
    categoryLabel: formatRequestTypeLabel(request.type),
    statusBucket: REQUEST_STATUS_TO_BUCKET[request.status],
    source: mapRequestSource(request),
    customerName: request.customerName,
    customerAddress: request.customerAddress,
    planName: request.planName,
    priority: null,
    assignedOfficerId: request.assignedOfficerId,
    assignedOfficerName: request.assignedOfficerName,
    assignedOfficerRole: request.assignedOfficerRole,
    createdAt: request.createdAt,
    assignedAt: request.assignedAt,
    slaBreached: false,
    ticket: null,
    request,
  };
}

export function buildPortalItems(tickets: Ticket[], requests: ServiceRequest[]): PortalTicketItem[] {
  const linkedRequestIds = new Set(
    tickets.map((t) => t.linkedRequestId).filter((id): id is string => Boolean(id)),
  );

  const orphanRequests = requests.filter(
    (r) => !r.linkedTicketId && !linkedRequestIds.has(r.id),
  );

  const ticketItems = tickets.map(ticketToPortalItem);
  const requestItems = orphanRequests.map(requestToPortalItem);

  return [...ticketItems, ...requestItems].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

/** JSON-safe copy for RTK Query cache (Date → ISO string in nested ticket/request). */
export function serializePortalItemsForCache(items: PortalTicketItem[]): PortalTicketItem[] {
  return JSON.parse(JSON.stringify(items)) as PortalTicketItem[];
}

export function serializePortalItemForCache(item: PortalTicketItem): PortalTicketItem {
  return JSON.parse(JSON.stringify(item)) as PortalTicketItem;
}

function priorityRank(priority: TicketPriority | null): number {
  if (!priority) return 0;
  const order: Record<TicketPriority, number> = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };
  return order[priority];
}

export function applyPortalFilters(items: PortalTicketItem[], filters: PortalTicketFilters): PortalTicketItem[] {
  let result = [...items];

  if (filters.status !== 'All') {
    result = result.filter((item) => item.statusBucket === filters.status);
  }

  if (filters.source !== 'All') {
    result = result.filter((item) => item.source === filters.source);
  }

  if (filters.assignment === 'assigned') {
    result = result.filter((item) => Boolean(item.assignedOfficerId));
  } else if (filters.assignment === 'unassigned') {
    result = result.filter((item) => !item.assignedOfficerId);
  }

  if (filters.slaBreached === true) {
    result = result.filter((item) => item.slaBreached);
  }

  const q = filters.searchQuery.trim().toLowerCase();
  if (q) {
    result = result.filter((item) => {
      const haystack = [
        item.displayNumber,
        item.categoryLabel,
        item.customerName,
        item.customerAddress,
        item.planName,
        item.assignedOfficerName ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  result.sort((a, b) => {
    switch (filters.sortBy) {
      case 'oldest':
        return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      case 'priority_high':
        return priorityRank(b.priority) - priorityRank(a.priority);
      case 'sla_urgent':
        return (
          Number(b.slaBreached) - Number(a.slaBreached) ||
          Date.parse(b.createdAt) - Date.parse(a.createdAt)
        );
      case 'newest':
      default:
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    }
  });

  return result;
}

export function computePortalStats(
  items: PortalTicketItem[],
  todayCount: number,
  avgCsatScore: number | null,
): import('@/types/portalTicket').TicketPortalStats {
  const open = items.filter((i) => i.statusBucket === 'Open').length;
  const reopened = items.filter((i) => i.statusBucket === 'Reopened').length;
  const inProgress = items.filter((i) => i.statusBucket === 'In Progress').length;
  const awaitingCustomer = items.filter((i) => i.statusBucket === 'Awaiting Customer').length;
  const awaitingParts = items.filter((i) => i.statusBucket === 'Awaiting Parts').length;
  const resolved = items.filter((i) => i.statusBucket === 'Resolved').length;
  const closed = items.filter((i) => i.statusBucket === 'Closed').length;
  const slaBreaches = items.filter((i) => i.slaBreached).length;
  const unassigned = items.filter((i) => !i.assignedOfficerId).length;
  const assigned = items.filter((i) => Boolean(i.assignedOfficerId)).length;

  return {
    total: items.length,
    totalOpen: open + reopened,
    totalInProgress: inProgress,
    totalAwaiting: awaitingCustomer + awaitingParts,
    totalAwaitingCustomer: awaitingCustomer,
    totalAwaitingParts: awaitingParts,
    totalResolved: resolved,
    totalClosed: closed,
    totalReopened: reopened,
    slaBreaches,
    unassigned,
    assigned,
    today: todayCount,
    avgCsatScore,
  };
}

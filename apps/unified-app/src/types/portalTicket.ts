import type { ServiceRequest } from '@/types/requests';
import type { Ticket, TicketPriority, TicketStatus } from '@/types/tickets';

export type PortalItemSource = 'customer' | 'officer' | 'admin';

export type PortalItemKind = 'ticket' | 'request';

/** Unified status bucket used by Ticket Portal filter chips and stats. */
export type PortalStatusBucket =
  | 'Open'
  | 'In Progress'
  | 'Awaiting Customer'
  | 'Awaiting Parts'
  | 'Resolved'
  | 'Closed'
  | 'Reopened';

export interface PortalTicketItem {
  id: string;
  kind: PortalItemKind;
  ticketId: string | null;
  requestId: string | null;
  displayNumber: string;
  categoryLabel: string;
  statusBucket: PortalStatusBucket;
  source: PortalItemSource;
  customerName: string;
  customerAddress: string;
  planName: string;
  priority: TicketPriority | null;
  assignedOfficerId: string | null;
  assignedOfficerName: string | null;
  assignedOfficerRole: string | null;
  createdAt: string;
  assignedAt: string | null;
  slaBreached: boolean;
  ticket: Ticket | null;
  request: ServiceRequest | null;
}

export type PortalViewMode = 'assignment' | 'status';

export type PortalSourceFilter = PortalItemSource | 'All';

export interface PortalTicketFilters {
  status: PortalStatusBucket | 'All';
  source: PortalSourceFilter;
  assignment: 'all' | 'assigned' | 'unassigned';
  sortBy: 'newest' | 'oldest' | 'priority_high' | 'sla_urgent';
  searchQuery: string;
  slaBreached: boolean | null;
}

export interface TicketPortalStats {
  total: number;
  totalOpen: number;
  totalInProgress: number;
  totalAwaiting: number;
  totalAwaitingCustomer: number;
  totalAwaitingParts: number;
  totalResolved: number;
  totalClosed: number;
  totalReopened: number;
  slaBreaches: number;
  unassigned: number;
  assigned: number;
  today: number;
  avgCsatScore: number | null;
}

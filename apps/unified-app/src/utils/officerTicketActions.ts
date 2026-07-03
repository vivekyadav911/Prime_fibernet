import type { PortalItemKind } from '@/types/portalTicket';
import type { TicketStatus } from '@/types/tickets';

export function getOfficerTicketAdvanceLabel(statusBucket: string): string | undefined {
  if (statusBucket === 'Open' || statusBucket === 'Reopened') return 'Accept';
  if (
    statusBucket === 'In Progress' ||
    statusBucket === 'Awaiting Customer' ||
    statusBucket === 'Awaiting Parts'
  ) {
    return 'Mark resolved';
  }
  return undefined;
}

export function nextTicketStatusForOfficer(current: TicketStatus): TicketStatus | null {
  if (current === 'Open' || current === 'Reopened') return 'In Progress';
  if (
    current === 'In Progress' ||
    current === 'Awaiting Customer' ||
    current === 'Awaiting Parts'
  ) {
    return 'Resolved';
  }
  return null;
}

export function nextRequestStatusForOfficer(current: string): string | null {
  const normalized = current.trim().toLowerCase().replace(/\s+/g, '_');
  const flow: Record<string, string> = {
    pending: 'in_transit',
    assigned: 'in_transit',
    in_progress: 'in_transit',
    in_transit: 'on_site',
    on_site: 'working',
    working: 'resolved',
  };
  return flow[normalized] ?? null;
}

export type OfficerDetailParams = {
  requestId: string;
  kind?: PortalItemKind;
};

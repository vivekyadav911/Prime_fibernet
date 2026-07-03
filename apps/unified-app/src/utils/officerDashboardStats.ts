import type { PortalTicketItem } from '@/types/portalTicket';

import { matchesOfficerTicketFilter } from '@/utils/officerTicketFilters';

function parseDate(value: string | Date | undefined | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export type OfficerDashboardStatCounts = {
  newTickets: number;
  activeTickets: number;
  resolvedToday: number;
};

/** Derive dashboard stat tiles from the same portal-item list as Today's Assignments. */
export function computeOfficerPortalDashboardStats(
  items: PortalTicketItem[],
): OfficerDashboardStatCounts {
  let newTickets = 0;
  let activeTickets = 0;
  let resolvedToday = 0;

  for (const item of items) {
    if (matchesOfficerTicketFilter(item, 'new')) newTickets += 1;
    if (matchesOfficerTicketFilter(item, 'active')) activeTickets += 1;
    if (matchesOfficerTicketFilter(item, 'done')) {
      const resolvedAt =
        parseDate(item.ticket?.resolvedAt) ??
        parseDate(item.request?.completedAt) ??
        parseDate(item.createdAt);
      if (resolvedAt && isToday(resolvedAt)) resolvedToday += 1;
    }
  }

  return { newTickets, activeTickets, resolvedToday };
}

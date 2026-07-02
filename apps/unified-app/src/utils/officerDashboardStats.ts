import type { ServiceRequest } from '@prime/types';

const NEW_STATUSES = new Set(['pending', 'assigned']);
const ACTIVE_STATUSES = new Set(['in_transit', 'on_site', 'working', 'accepted']);

function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
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
  newRequests: number;
  activeRequests: number;
  resolvedToday: number;
};

/**
 * Derive dashboard stat tiles from the same assigned-request list shown on the officer dashboard.
 */
export function computeOfficerDashboardStats(
  requests: ServiceRequest[],
): OfficerDashboardStatCounts {
  let newRequests = 0;
  let activeRequests = 0;
  let resolvedToday = 0;

  for (const request of requests) {
    const status = String(request.status ?? '').toLowerCase();
    if (NEW_STATUSES.has(status)) newRequests += 1;
    if (ACTIVE_STATUSES.has(status)) activeRequests += 1;
    if (status === 'resolved' || status === 'closed') {
      const completedAt = parseDate(request.completedAt ?? null);
      const updatedAt = parseDate(request.updatedAt ?? null);
      const createdAt = parseDate(request.createdAt);
      const resolvedDate = completedAt ?? updatedAt ?? createdAt;
      if (resolvedDate && isToday(resolvedDate)) resolvedToday += 1;
    }
  }

  return { newRequests, activeRequests, resolvedToday };
}

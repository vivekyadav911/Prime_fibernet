import type { SLAPolicy, SLAStatus, Ticket, TicketPriority } from '@/types/tickets';

export const DEFAULT_SLA_POLICIES: Record<TicketPriority, SLAPolicy> = {
  Critical: { priorityLevel: 'Critical', responseTimeHours: 1, resolutionTimeHours: 4 },
  High: { priorityLevel: 'High', responseTimeHours: 4, resolutionTimeHours: 12 },
  Medium: { priorityLevel: 'Medium', responseTimeHours: 8, resolutionTimeHours: 24 },
  Low: { priorityLevel: 'Low', responseTimeHours: 24, resolutionTimeHours: 72 },
};

export function computeSLADeadlines(
  priority: TicketPriority,
  createdAt: Date,
): { responseDeadline: Date; resolutionDeadline: Date } {
  const policy = DEFAULT_SLA_POLICIES[priority];
  const responseDeadline = new Date(createdAt.getTime() + policy.responseTimeHours * 60 * 60 * 1000);
  const resolutionDeadline = new Date(createdAt.getTime() + policy.resolutionTimeHours * 60 * 60 * 1000);
  return { responseDeadline, resolutionDeadline };
}

export function computeSLAStatus(ticket: Ticket, now = new Date()): SLAStatus {
  const policy = DEFAULT_SLA_POLICIES[ticket.priority];
  const responseDeadline = ticket.slaStatus.responseDeadline;
  const resolutionDeadline = ticket.slaStatus.resolutionDeadline;
  const responseRemainingMs = responseDeadline.getTime() - now.getTime();
  const resolutionRemainingMs = resolutionDeadline.getTime() - now.getTime();

  const responseBreached = responseRemainingMs <= 0;
  const resolutionBreached = resolutionRemainingMs <= 0;

  return {
    responseBreached,
    resolutionBreached,
    responseDeadline,
    resolutionDeadline,
    responseRemainingMs,
    resolutionRemainingMs,
  };
}

export function isSLABreached(ticket: Ticket, now = new Date()): boolean {
  const status = computeSLAStatus(ticket, now);
  return status.responseBreached || status.resolutionBreached;
}

export function formatSLARemaining(ms: number): string {
  if (ms <= 0) {
    const agoMs = Math.abs(ms);
    const hours = Math.floor(agoMs / (60 * 60 * 1000));
    const minutes = Math.floor((agoMs % (60 * 60 * 1000)) / (60 * 1000));
    if (hours > 0) return `BREACHED ${hours}h ago`;
    return `BREACHED ${minutes}m ago`;
  }

  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export function getSLAColor(remainingMs: number, totalMs: number): string {
  if (remainingMs <= 0) return '#EF4444';
  const ratio = remainingMs / totalMs;
  if (ratio > 0.5) return '#10B981';
  if (ratio > 0.2) return '#F59E0B';
  return '#EF4444';
}

export function getSLAPolicy(priority: TicketPriority): SLAPolicy {
  return DEFAULT_SLA_POLICIES[priority];
}

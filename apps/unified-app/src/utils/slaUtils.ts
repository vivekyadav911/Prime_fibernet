import type {
  SLAPolicy,
  SlaProgressState,
  SLAStatus,
  Ticket,
  TicketPriority,
  TicketSlaStatusValue,
  TicketStats,
} from '@/types/tickets';
import { getSupabase } from '@/services/supabase';

export const DEFAULT_SLA_POLICIES: Record<TicketPriority, SLAPolicy> = {
  Critical: { priorityLevel: 'Critical', responseTimeHours: 0.5, resolutionTimeHours: 2 },
  High: { priorityLevel: 'High', responseTimeHours: 1, resolutionTimeHours: 4 },
  Medium: { priorityLevel: 'Medium', responseTimeHours: 4, resolutionTimeHours: 24 },
  Low: { priorityLevel: 'Low', responseTimeHours: 8, resolutionTimeHours: 72 },
};

const TERMINAL_STATUSES = new Set(['Resolved', 'Closed']);

let cachedDbPolicies: Record<TicketPriority, SLAPolicy> | null = null;

export async function loadSlaPoliciesFromDb(): Promise<Record<TicketPriority, SLAPolicy>> {
  if (cachedDbPolicies) return cachedDbPolicies;
  try {
    const client = getSupabase();
    const { data } = await client.from('sla_policies').select('*').eq('is_active', true);
    if (!data?.length) return DEFAULT_SLA_POLICIES;
    const mapped = { ...DEFAULT_SLA_POLICIES };
    for (const row of data) {
      const priority = String(row.priority) as TicketPriority;
      mapped[priority] = {
        priorityLevel: priority,
        responseTimeHours: Number(row.first_response_hours),
        resolutionTimeHours: Number(row.resolution_hours),
      };
    }
    cachedDbPolicies = mapped;
    return mapped;
  } catch {
    return DEFAULT_SLA_POLICIES;
  }
}

export function getSLAPolicy(priority: TicketPriority): SLAPolicy {
  return (cachedDbPolicies ?? DEFAULT_SLA_POLICIES)[priority];
}

export function computeSLADeadlines(
  priority: TicketPriority,
  createdAt: Date,
): { responseDeadline: Date; resolutionDeadline: Date } {
  const policy = getSLAPolicy(priority);
  const responseDeadline = new Date(createdAt.getTime() + policy.responseTimeHours * 60 * 60 * 1000);
  const resolutionDeadline = new Date(
    createdAt.getTime() + policy.resolutionTimeHours * 60 * 60 * 1000,
  );
  return { responseDeadline, resolutionDeadline };
}

export function parseSlaStatus(value: unknown): TicketSlaStatusValue {
  const s = String(value ?? 'pending');
  if (s === 'met' || s === 'breached' || s === 'na' || s === 'pending') return s;
  return 'pending';
}

export function isTicketTerminal(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** Frozen column when decided; live evaluation only while pending and ticket is open */
export function getEffectiveResponseSlaStatus(ticket: Ticket, now = new Date()): TicketSlaStatusValue {
  if (ticket.responseSlaStatus !== 'pending') return ticket.responseSlaStatus;
  if (isTicketTerminal(ticket.status)) return ticket.responseSlaStatus;
  return now.getTime() > ticket.slaStatus.responseDeadline.getTime() ? 'breached' : 'pending';
}

export function getEffectiveResolutionSlaStatus(ticket: Ticket, now = new Date()): TicketSlaStatusValue {
  if (ticket.resolutionSlaStatus !== 'pending') return ticket.resolutionSlaStatus;
  if (isTicketTerminal(ticket.status)) return ticket.resolutionSlaStatus;
  return now.getTime() > ticket.slaStatus.resolutionDeadline.getTime() ? 'breached' : 'pending';
}

export function buildSlaStatusFromTicket(ticket: Ticket, now = new Date()): SLAStatus {
  const responseLive = getEffectiveResponseSlaStatus(ticket, now);
  const resolutionLive = getEffectiveResolutionSlaStatus(ticket, now);
  const responseDeadline = ticket.slaStatus.responseDeadline;
  const resolutionDeadline = ticket.slaStatus.resolutionDeadline;

  return {
    responseStatus: ticket.responseSlaStatus,
    resolutionStatus: ticket.resolutionSlaStatus,
    responseLive,
    resolutionLive,
    responseBreached: responseLive === 'breached',
    resolutionBreached: resolutionLive === 'breached',
    responseDeadline,
    resolutionDeadline,
    responseRemainingMs: responseDeadline.getTime() - now.getTime(),
    resolutionRemainingMs: resolutionDeadline.getTime() - now.getTime(),
    respondedAt: ticket.respondedAt,
    resolvedAt: ticket.resolvedAt,
  };
}

/** @deprecated Use buildSlaStatusFromTicket — kept for gradual migration */
export function computeSLAStatus(ticket: Ticket, now = new Date()): SLAStatus {
  return buildSlaStatusFromTicket(ticket, now);
}

/** Only counts open/in-progress tickets that are currently breached */
export function isOpenTicketSlaBreached(ticket: Ticket, now = new Date()): boolean {
  if (isTicketTerminal(ticket.status)) return false;
  const sla = buildSlaStatusFromTicket(ticket, now);
  return sla.responseBreached || sla.resolutionBreached;
}

export function isSLABreached(ticket: Ticket, now = new Date()): boolean {
  return isOpenTicketSlaBreached(ticket, now);
}

export function computeTicketStats(tickets: Ticket[], now = new Date()): TicketStats {
  const open = tickets.filter((t) => t.status === 'Open' || t.status === 'Reopened').length;
  const inProgress = tickets.filter((t) => t.status === 'In Progress').length;
  const resolved = tickets.filter((t) => isTicketTerminal(t.status)).length;
  const slaBreaches = tickets.filter((t) => isOpenTicketSlaBreached(t, now)).length;
  const officersWithAssignments = new Set(
    tickets
      .filter((t) => !isTicketTerminal(t.status) && t.assignedOfficerId)
      .map((t) => t.assignedOfficerId),
  ).size;

  const resolvedTickets = tickets.filter((t) => t.resolvedAt);
  const avgResolutionHours =
    resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, t) => {
          const hours = (t.resolvedAt!.getTime() - t.createdAt.getTime()) / (60 * 60 * 1000);
          return sum + hours;
        }, 0) / resolvedTickets.length
      : 0;

  const byPriority = { Low: 0, Medium: 0, High: 0, Critical: 0 } as TicketStats['byPriority'];
  const byComplaintType = {} as TicketStats['byComplaintType'];

  for (const t of tickets) {
    byPriority[t.priority] += 1;
    byComplaintType[t.complaintType] = (byComplaintType[t.complaintType] ?? 0) + 1;
  }

  return {
    totalOpen: open,
    totalInProgress: inProgress,
    totalResolved: resolved,
    slaBreaches,
    officersWithAssignments,
    avgResolutionHours,
    byPriority,
    byComplaintType,
  };
}

export function getSlaProgressState(
  status: TicketSlaStatusValue,
  elapsedMs: number,
  windowMs: number,
): SlaProgressState {
  if (status === 'met') return 'met';
  if (status === 'breached') return 'breached';
  const ratio = windowMs > 0 ? elapsedMs / windowMs : 1;
  return ratio >= 0.75 ? 'at_risk' : 'on_track';
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

export function formatSlaProgressLabel(
  kind: 'response' | 'resolution',
  status: TicketSlaStatusValue,
  deadline: Date,
  eventAt: Date | null,
  now = new Date(),
): string {
  if (status === 'met' && eventAt) {
    const marginMs = deadline.getTime() - eventAt.getTime();
    const hours = Math.max(0, Math.floor(marginMs / (60 * 60 * 1000)));
    const minutes = Math.max(0, Math.floor((marginMs % (60 * 60 * 1000)) / (60 * 1000)));
    const margin =
      hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m` : 'just';
    return `Met — ${kind === 'response' ? 'responded' : 'resolved'} ${margin} before deadline`;
  }
  if (status === 'breached') {
    const breachAt = eventAt ?? now;
    const overMs = breachAt.getTime() - deadline.getTime();
    const hours = Math.max(0, Math.floor(overMs / (60 * 60 * 1000)));
    const minutes = Math.max(0, Math.floor((overMs % (60 * 60 * 1000)) / (60 * 1000)));
    if (hours > 0) return `Breached ${hours}h after deadline`;
    return `Breached ${minutes}m after deadline`;
  }
  return formatSLARemaining(deadline.getTime() - now.getTime());
}

export function getSLAColor(remainingMs: number, totalMs: number): string {
  if (remainingMs <= 0) return '#EF4444';
  const ratio = remainingMs / totalMs;
  if (ratio > 0.5) return '#10B981';
  if (ratio > 0.2) return '#F59E0B';
  return '#EF4444';
}

void loadSlaPoliciesFromDb();

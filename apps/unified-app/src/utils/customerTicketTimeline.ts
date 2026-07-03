import type { CustomerTicketTimelineItem } from '@/types/customer';

type ActivityRow = {
  id: string;
  type: string;
  description: string;
  performed_by: string;
  performed_by_role?: string | null;
  metadata?: Record<string, unknown> | null;
  timestamp: string;
};

const CUSTOMER_VISIBLE_TYPES = new Set([
  'created',
  'status_changed',
  'officer_assigned',
  'officer_reassigned',
  'resolved',
  'closed',
  'reopened',
]);

function isCustomerVisibleEvent(row: ActivityRow): boolean {
  if (!CUSTOMER_VISIBLE_TYPES.has(row.type)) return false;
  if (row.type === 'note_added') {
    return row.metadata?.internal !== true && row.metadata?.internal !== 'true';
  }
  return true;
}

function formatTimelineLabel(type: string, description: string, performedBy: string): string {
  if (type === 'officer_assigned' || type === 'officer_reassigned') {
    return performedBy ? `Assigned to ${performedBy}` : description;
  }
  if (type === 'status_changed') {
    const status = (description.match(/to\s+(.+)$/i)?.[1] ?? description).trim();
    return status ? `Status updated to ${status}` : 'Status updated';
  }
  if (type === 'resolved') return 'Ticket resolved';
  if (type === 'closed') return 'Ticket closed';
  if (type === 'reopened') return 'Ticket reopened';
  if (type === 'created') return 'Ticket raised';
  return description;
}

export function buildCustomerTicketTimeline(
  ticket: {
    createdAt: string;
    status: string;
    assignedOfficerName?: string | null;
  },
  activityRows: ActivityRow[],
  maxItems = 3,
): CustomerTicketTimelineItem[] {
  const visible = activityRows.filter(isCustomerVisibleEvent);

  const steps: CustomerTicketTimelineItem[] = [
    {
      id: 'raised',
      label: 'Ticket raised',
      timestamp: ticket.createdAt,
      isComplete: true,
    },
  ];

  const assignment = visible.find((e) => e.type === 'officer_assigned' || e.type === 'officer_reassigned');
  if (assignment) {
    steps.push({
      id: assignment.id,
      label: formatTimelineLabel(assignment.type, assignment.description, assignment.performed_by),
      timestamp: assignment.timestamp,
      isComplete: true,
    });
  } else if (ticket.assignedOfficerName) {
    steps.push({
      id: 'assigned-pending',
      label: `Assigned to ${ticket.assignedOfficerName}`,
      timestamp: null,
      isComplete: true,
    });
  }

  const terminal = visible.find((e) => e.type === 'resolved' || e.type === 'closed');
  if (terminal) {
    steps.push({
      id: terminal.id,
      label: formatTimelineLabel(terminal.type, terminal.description, terminal.performed_by),
      timestamp: terminal.timestamp,
      isComplete: true,
    });
  } else if (!['Resolved', 'Closed'].includes(ticket.status)) {
    steps.push({
      id: 'resolution-pending',
      label: 'Resolution pending',
      timestamp: null,
      isComplete: false,
    });
  }

  const statusEvents = visible
    .filter((e) => e.type === 'status_changed' && e.id !== assignment?.id)
    .map((e) => ({
      id: e.id,
      label: formatTimelineLabel(e.type, e.description, e.performed_by),
      timestamp: e.timestamp,
      isComplete: true,
    }));

  const merged = [...steps, ...statusEvents].sort((a, b) => {
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  const deduped: CustomerTicketTimelineItem[] = [];
  const seen = new Set<string>();
  for (const item of merged) {
    const key = item.label;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  if (deduped.length <= maxItems) return deduped;
  return deduped.slice(-maxItems);
}

export function mapActivityRow(row: Record<string, unknown>): ActivityRow {
  return {
    id: String(row.id),
    type: String(row.type),
    description: String(row.description),
    performed_by: String(row.performed_by),
    performed_by_role: (row.performed_by_role as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? null,
    timestamp: String(row.timestamp ?? row.created_at),
  };
}

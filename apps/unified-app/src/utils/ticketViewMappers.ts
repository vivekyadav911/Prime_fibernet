import type {
  ComplaintType,
  InternalNote,
  Ticket,
  TicketActivityEvent,
  TicketAttachment,
  TicketFilters,
  TicketPriority,
  TicketSource,
  TicketStatus,
} from '@/types/tickets';
import { computeSLADeadlines, computeSLAStatus, getSLAPolicy, isSLABreached } from '@/utils/slaUtils';

const PRIORITY_ORDER: Record<TicketPriority, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export function truncateTicketNumber(ticketNumber: string): string {
  const parts = ticketNumber.split('-');
  if (parts.length >= 3) {
    return `${parts[0]}-${parts[1]}-${parts[2]?.slice(0, 3) ?? ''}…`;
  }
  return ticketNumber.length > 14 ? `${ticketNumber.slice(0, 14)}…` : ticketNumber;
}

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

function mapActivityRow(row: Record<string, unknown>): TicketActivityEvent {
  const metadata = row.metadata;
  return {
    id: String(row.id),
    type: String(row.type) as TicketActivityEvent['type'],
    description: String(row.description ?? ''),
    performedBy: String(row.performed_by ?? ''),
    performedByRole: String(row.performed_by_role ?? ''),
    timestamp: parseDate(row.timestamp ?? row.created_at),
    metadata:
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? Object.fromEntries(
            Object.entries(metadata as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
          )
        : undefined,
  };
}

function mapNoteRow(
  row: Record<string, unknown>,
  attachments: TicketAttachment[],
): InternalNote {
  return {
    id: String(row.id),
    content: String(row.content ?? ''),
    authorId: String(row.author_id ?? ''),
    authorName: String(row.author_name ?? ''),
    authorRole: String(row.author_role ?? ''),
    createdAt: parseDate(row.created_at),
    isInternal: row.is_internal !== false,
    attachments: attachments.filter((a) => a.id.startsWith(String(row.id)) === false),
  };
}

function mapAttachmentRow(row: Record<string, unknown>): TicketAttachment {
  const fileType = String(row.file_type ?? 'other');
  const normalizedType: TicketAttachment['fileType'] =
    fileType === 'image' || fileType === 'pdf' || fileType === 'doc' ? fileType : 'other';

  return {
    id: String(row.id),
    fileName: String(row.file_name ?? ''),
    fileUrl: String(row.file_url ?? ''),
    fileType: normalizedType,
    uploadedBy: String(row.uploaded_by ?? ''),
    uploadedAt: parseDate(row.uploaded_at),
    sizeBytes: Number(row.size_bytes ?? 0),
  };
}

export function mapDbRowToTicket(
  row: Record<string, unknown>,
  activities: TicketActivityEvent[] = [],
  notes: InternalNote[] = [],
  attachments: TicketAttachment[] = [],
): Ticket {
  const priority = String(row.priority ?? 'Medium') as TicketPriority;
  const createdAt = parseDate(row.created_at);
  const policy = getSLAPolicy(priority);
  const responseDeadline = parseDate(row.sla_response_deadline ?? createdAt);
  const resolutionDeadline = parseDate(row.sla_resolution_deadline ?? createdAt);

  const baseTicket: Ticket = {
    id: String(row.id),
    ticketNumber: String(row.ticket_number ?? ''),
    title: String(row.title ?? ''),
    contactName: String(row.contact_name ?? ''),
    contactPhone: String(row.contact_phone ?? ''),
    contactEmail: String(row.contact_email ?? ''),
    address: String(row.address ?? ''),
    city: String(row.city ?? ''),
    complaintType: String(row.complaint_type ?? 'Other') as ComplaintType,
    priority,
    status: String(row.status ?? 'Open') as TicketStatus,
    source: String(row.source ?? 'admin') as TicketSource,
    description: String(row.description ?? ''),
    assignedOfficerId: row.assigned_officer_id ? String(row.assigned_officer_id) : null,
    assignedOfficerName: row.assigned_officer_name ? String(row.assigned_officer_name) : null,
    assignedOfficerRole: row.assigned_officer_role ? String(row.assigned_officer_role) : null,
    assignedAt: row.assigned_at ? parseDate(row.assigned_at) : null,
    resolvedAt: row.resolved_at ? parseDate(row.resolved_at) : null,
    closedAt: row.closed_at ? parseDate(row.closed_at) : null,
    createdAt,
    updatedAt: parseDate(row.updated_at ?? createdAt),
    createdByAdminId: String(row.created_by_admin_id ?? ''),
    createdByAdminName: String(row.created_by_admin_name ?? 'Admin'),
    linkedRequestId: row.linked_request_id ? String(row.linked_request_id) : null,
    linkedRequestNumber: row.linked_request_number ? String(row.linked_request_number) : null,
    customerId: row.customer_id ? String(row.customer_id) : null,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    internalNotes: notes,
    activityTimeline: activities,
    attachments,
    slaPolicy: policy,
    slaStatus: {
      responseBreached: Boolean(row.sla_response_breached),
      resolutionBreached: Boolean(row.sla_resolution_breached),
      responseDeadline,
      resolutionDeadline,
      responseRemainingMs: responseDeadline.getTime() - Date.now(),
      resolutionRemainingMs: resolutionDeadline.getTime() - Date.now(),
    },
    resolutionSummary: row.resolution_summary ? String(row.resolution_summary) : null,
    customerNotified: Boolean(row.customer_notified),
  };

  baseTicket.slaStatus = computeSLAStatus(baseTicket);
  return baseTicket;
}

export function applyTicketFilters(tickets: Ticket[], filters: TicketFilters): Ticket[] {
  let result = [...tickets];

  if (filters.status !== 'All') {
    result = result.filter((t) => t.status === filters.status);
  }
  if (filters.priority !== 'All') {
    result = result.filter((t) => t.priority === filters.priority);
  }
  if (filters.complaintType !== 'All') {
    result = result.filter((t) => t.complaintType === filters.complaintType);
  }
  if (filters.assignment === 'assigned') {
    result = result.filter((t) => !!t.assignedOfficerId);
  } else if (filters.assignment === 'unassigned') {
    result = result.filter((t) => !t.assignedOfficerId);
  }
  if (filters.slaBreached === true) {
    result = result.filter((t) => isSLABreached(t));
  } else if (filters.slaBreached === false) {
    result = result.filter((t) => !isSLABreached(t));
  }
  if (filters.dateRange.from) {
    result = result.filter((t) => t.createdAt >= filters.dateRange.from!);
  }
  if (filters.dateRange.to) {
    const end = new Date(filters.dateRange.to);
    end.setHours(23, 59, 59, 999);
    result = result.filter((t) => t.createdAt <= end);
  }

  const q = filters.searchQuery.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (t) =>
        t.ticketNumber.toLowerCase().includes(q) ||
        t.contactName.toLowerCase().includes(q) ||
        t.complaintType.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q),
    );
  }

  switch (filters.sortBy) {
    case 'oldest':
      result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      break;
    case 'priority_high':
      result.sort((a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]);
      break;
    case 'sla_urgent':
      result.sort(
        (a, b) =>
          Math.min(a.slaStatus.responseRemainingMs, a.slaStatus.resolutionRemainingMs) -
          Math.min(b.slaStatus.responseRemainingMs, b.slaStatus.resolutionRemainingMs),
      );
      break;
    case 'newest':
    default:
      result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
  }

  return result;
}

export function buildTicketTitle(complaintType: ComplaintType, contactName: string): string {
  return `${complaintType} — ${contactName}`;
}

export function buildSlaInsertFields(priority: TicketPriority, createdAt: Date) {
  const { responseDeadline, resolutionDeadline } = computeSLADeadlines(priority, createdAt);
  return {
    sla_response_deadline: responseDeadline.toISOString(),
    sla_resolution_deadline: resolutionDeadline.toISOString(),
    sla_response_breached: false,
    sla_resolution_breached: false,
  };
}

export { mapActivityRow, mapNoteRow, mapAttachmentRow };

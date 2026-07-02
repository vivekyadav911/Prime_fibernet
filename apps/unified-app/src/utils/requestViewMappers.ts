import type {
  ActivityEvent,
  RequestFilters,
  RequestSource,
  RequestStatus,
  RequestType,
  ServiceRequest,
} from '@/types/requests';
import { formatRequestTypeLabel } from '@/constants/requestTypes';
import { resolveCustomerName, resolvePlanName } from '@/utils/supportDisplay';
import { resolveOfficerName } from '@/utils/resolveOfficerName';

const DB_STATUS_MAP: Record<string, RequestStatus> = {
  pending: 'Pending',
  assigned: 'In Progress',
  in_progress: 'In Progress',
  awaiting_customer: 'In Progress',
  working: 'In Progress',
  resolved: 'Completed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoString(value: unknown, fallback = new Date()): string {
  return (parseDate(value) ?? fallback).toISOString();
}

function titleCaseType(raw: string): RequestType {
  return formatRequestTypeLabel(raw) as RequestType;
}

export function mapDbRequestType(raw: unknown): RequestType {
  if (!raw || typeof raw !== 'string') return 'Issue';
  return titleCaseType(raw);
}

export function mapDbRequestStatus(raw: unknown): RequestStatus {
  if (!raw || typeof raw !== 'string') return 'Pending';
  return DB_STATUS_MAP[raw.toLowerCase()] ?? 'Pending';
}

export function mapDbRequestSource(row: Record<string, unknown>): RequestSource {
  if (row.created_by_admin_id) return 'admin';
  const source = String(row.source ?? '').toLowerCase();
  if (source === 'admin') return 'admin';
  return 'customer';
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

function mapActivityRow(row: Record<string, unknown>): ActivityEvent {
  const action = String(row.action ?? '').toLowerCase();
  const note = String(row.note ?? row.notes ?? '').trim();
  const actor = String(row.actor_name ?? row.performed_by ?? 'System');

  let type: ActivityEvent['type'] = 'note_added';
  let description = note || String(row.action ?? 'Activity recorded');

  if (action.includes('self-assign')) {
    type = 'self_assigned';
    description = note || 'Officer picked this request to work on';
  } else if (action.includes('reassign')) {
    type = 'officer_reassigned';
    description = note || 'Officer reassigned by admin';
  } else if (action.includes('officer assigned') || action.includes('assigned to')) {
    type = 'officer_assigned';
    description = note || 'Officer assigned by admin';
  } else if (action.includes('status')) {
    type = 'status_updated';
    description = note || String(row.action ?? 'Status updated');
  } else if (note) {
    type = 'note_added';
    description = note;
  }

  return {
    id: String(row.id),
    type,
    description,
    performedBy: actor,
    performedByRole: undefined,
    timestamp: toIsoString(row.created_at ?? row.timestamp),
  };
}

/** Map a canonical support_items_view row (+ optional raw request row) to ServiceRequest. */
export function mapSupportViewRowToServiceRequest(
  viewRow: Record<string, unknown>,
  rawRow: Record<string, unknown>,
  activities: Record<string, unknown>[] = [],
): ServiceRequest {
  const requestId = String(viewRow.request_id ?? rawRow.id);
  const customerId = viewRow.customer_id ? String(viewRow.customer_id) : String(rawRow.user_id ?? '');
  const planId = viewRow.plan_id ? String(viewRow.plan_id) : rawRow.plan_id ? String(rawRow.plan_id) : null;

  const customerName = resolveCustomerName(
    customerId || null,
    viewRow.customer_name ? String(viewRow.customer_name) : null,
    String(rawRow.user_name ?? rawRow.contact_name ?? ''),
    `request:${requestId}`,
  );

  const resolvedPlan = resolvePlanName(
    planId,
    viewRow.plan_name ? String(viewRow.plan_name) : null,
    `request:${requestId}`,
  );

  const timeline = activities
    .map(mapActivityRow)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  const officerId = viewRow.officer_id ? String(viewRow.officer_id) : rawRow.officer_id ? String(rawRow.officer_id) : null;
  const address =
    String(viewRow.customer_address ?? rawRow.location_address ?? rawRow.address ?? '').trim() ||
    [rawRow.city].filter(Boolean).join(', ');

  return {
    id: requestId,
    requestNumber: String(viewRow.request_number ?? rawRow.request_number ?? requestId),
    type: mapDbRequestType(rawRow.request_type ?? rawRow.type),
    status: mapDbRequestStatus(rawRow.status),
    source: mapDbRequestSource(rawRow),
    customerId,
    customerName,
    customerEmail: String(viewRow.customer_email ?? rawRow.user_email ?? ''),
    customerPhone: String(viewRow.customer_phone ?? rawRow.user_phone ?? ''),
    customerAddress: address,
    planId,
    planName: resolvedPlan ?? '—',
    planIsActive: viewRow.plan_is_active != null ? Boolean(viewRow.plan_is_active) : null,
    assignedOfficerId: officerId,
    assignedOfficerName: officerId
      ? resolveOfficerName(officerId, {
          denormalizedName: viewRow.officer_name ? String(viewRow.officer_name) : null,
          fullName: viewRow.officer_full_name ? String(viewRow.officer_full_name) : null,
          userName: viewRow.officer_user_name ? String(viewRow.officer_user_name) : null,
          context: `request:${requestId}`,
        })
      : null,
    assignedOfficerRole: officerId ? String(viewRow.officer_role ?? 'Field Technician') : null,
    createdAt: toIsoString(rawRow.created_at),
    assignedAt: officerId && parseDate(rawRow.assigned_at ?? rawRow.updated_at)
      ? toIsoString(rawRow.assigned_at ?? rawRow.updated_at)
      : null,
    completedAt: parseDate(rawRow.completed_at)?.toISOString() ?? null,
    activityTimeline: timeline,
    notes: timeline.filter((e) => e.type === 'note_added').map((e) => e.description),
    linkedTicketId: viewRow.ticket_id ? String(viewRow.ticket_id) : rawRow.linked_ticket_id ? String(rawRow.linked_ticket_id) : null,
  };
}

export function mapDbRowToServiceRequest(
  row: Record<string, unknown>,
  activities: Record<string, unknown>[] = [],
  planNameById: Map<string, { name: string; isActive: boolean }> = new Map(),
): ServiceRequest {
  const planId = row.plan_id ? String(row.plan_id) : null;
  const planMeta = planId ? planNameById.get(planId) : undefined;
  const officerId = row.officer_id ? String(row.officer_id) : null;
  const customerId = row.user_id ? String(row.user_id) : '';
  const address =
    String(row.location_address ?? row.address ?? '').trim() ||
    [row.city].filter(Boolean).join(', ');

  const customerName = resolveCustomerName(
    customerId || null,
    row.user_name ? String(row.user_name) : null,
    null,
    `request:${String(row.id)}`,
  );

  const resolvedPlan = resolvePlanName(
    planId,
    planMeta?.name ?? null,
    `request:${String(row.id)}`,
  );

  const timeline = activities
    .map(mapActivityRow)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  const notes = timeline.filter((e) => e.type === 'note_added').map((e) => e.description);

  const updatedAt = parseDate(row.updated_at);
  const createdAtIso = toIsoString(row.created_at);

  return {
    id: String(row.id),
    requestNumber: String(row.request_number ?? row.id),
    type: mapDbRequestType(row.request_type ?? row.type),
    status: mapDbRequestStatus(row.status),
    source: mapDbRequestSource(row),
    customerId,
    customerName,
    customerEmail: String(row.user_email ?? ''),
    customerPhone: String(row.user_phone ?? ''),
    customerAddress: address,
    planId,
    planName: resolvedPlan ?? '—',
    planIsActive: planMeta?.isActive ?? (planId ? null : null),
    assignedOfficerId: officerId,
    assignedOfficerName: officerId
      ? resolveOfficerName(officerId, {
          denormalizedName: row.officer_name ? String(row.officer_name) : null,
          context: `request:${String(row.id)}`,
        })
      : null,
    assignedOfficerRole: officerId ? 'Field Technician' : null,
    createdAt: createdAtIso,
    assignedAt: officerId ? toIsoString(row.assigned_at ?? row.updated_at) : null,
    completedAt: parseDate(row.completed_at)?.toISOString() ?? null,
    activityTimeline: timeline,
    notes,
    linkedTicketId: row.linked_ticket_id ? String(row.linked_ticket_id) : null,
  };
}

export function truncateRequestId(id: string, requestNumber?: string): string {
  if (requestNumber && requestNumber !== id && !requestNumber.includes('-')) {
    return requestNumber;
  }
  if (requestNumber && requestNumber.startsWith('REQ-')) {
    return requestNumber;
  }
  return `#${id.slice(0, 8).toUpperCase()}`;
}

export function applyRequestFilters(
  requests: ServiceRequest[],
  filters: RequestFilters,
): ServiceRequest[] {
  let result = [...requests];

  if (filters.status !== 'All') {
    result = result.filter((r) => r.status === filters.status);
  }

  if (filters.source !== 'All') {
    result = result.filter((r) => r.source === filters.source);
  }

  if (filters.assignment === 'assigned') {
    result = result.filter((r) => !!r.assignedOfficerId);
  } else if (filters.assignment === 'unassigned') {
    result = result.filter((r) => !r.assignedOfficerId);
  }

  const q = filters.searchQuery.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.requestNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q),
    );
  }

  result.sort((a, b) => {
    const diff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    return filters.sortBy === 'newest' ? diff : -diff;
  });

  return result;
}

export function applyExportFilters(
  requests: ServiceRequest[],
  filters: { status: RequestStatus | 'All'; sortBy: 'newest' | 'oldest'; assignment: RequestFilters['assignment'] },
): ServiceRequest[] {
  return applyRequestFilters(requests, {
    status: filters.status,
    source: 'All',
    assignment: filters.assignment,
    sortBy: filters.sortBy,
    searchQuery: '',
  });
}

export function officerInitials(name: string): string {
  return initials(name);
}

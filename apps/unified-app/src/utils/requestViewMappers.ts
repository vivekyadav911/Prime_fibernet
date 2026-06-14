import type {
  ActivityEvent,
  RequestFilters,
  RequestSource,
  RequestStatus,
  RequestType,
  ServiceRequest,
} from '@/types/requests';

const DB_TYPE_MAP: Record<string, RequestType> = {
  installation: 'New Connection',
  repair: 'Issue',
  complaint: 'Issue',
  upgrade: 'Upgrade',
  relocation: 'Relocation',
  disconnection: 'Disconnection',
  'new connection': 'New Connection',
  issue: 'Issue',
};

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

function titleCaseType(raw: string): RequestType {
  const normalized = raw.trim().toLowerCase();
  if (DB_TYPE_MAP[normalized]) return DB_TYPE_MAP[normalized];
  const titled = raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  if (['New Connection', 'Issue', 'Relocation', 'Upgrade', 'Disconnection'].includes(titled)) {
    return titled as RequestType;
  }
  return 'Issue';
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
  const note = String(row.notes ?? row.note ?? '').trim();
  const actor = String(row.actor_name ?? 'System');

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
    timestamp: parseDate(row.timestamp ?? row.created_at) ?? new Date(),
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
  const address =
    String(row.location_address ?? row.address ?? '').trim() ||
    [row.city].filter(Boolean).join(', ');

  const timeline = activities
    .map(mapActivityRow)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const notes = timeline.filter((e) => e.type === 'note_added').map((e) => e.description);

  const updatedAt = parseDate(row.updated_at);
  const createdAt = parseDate(row.created_at) ?? new Date();

  return {
    id: String(row.id),
    requestNumber: String(row.id),
    type: mapDbRequestType(row.request_type ?? row.type),
    status: mapDbRequestStatus(row.status),
    source: mapDbRequestSource(row),
    customerId: String(row.user_id ?? ''),
    customerName: String(row.user_name ?? 'Unknown Customer'),
    customerEmail: String(row.user_email ?? ''),
    customerPhone: String(row.user_phone ?? ''),
    customerAddress: address,
    planId,
    planName: planMeta?.name ?? (planId ? 'Unknown Plan' : 'Unknown Plan'),
    planIsActive: planMeta?.isActive ?? null,
    assignedOfficerId: officerId,
    assignedOfficerName: officerId ? String(row.officer_name ?? 'Officer') : null,
    assignedOfficerRole: officerId ? 'Field Technician' : null,
    createdAt,
    assignedAt: officerId ? updatedAt : null,
    completedAt: parseDate(row.completed_at),
    activityTimeline: timeline,
    notes,
  };
}

export function truncateRequestId(id: string): string {
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
    const diff = b.createdAt.getTime() - a.createdAt.getTime();
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

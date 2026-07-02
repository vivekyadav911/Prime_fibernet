/**
 * Canonical service-request type vocabulary — single source for admin, officer, and ticket surfaces.
 * DB stores snake_case / legacy values; UI always uses REQUEST_TYPE_LABELS for display.
 */
export const CANONICAL_REQUEST_TYPE_VALUES = [
  'new_connection',
  'repair',
  'disconnection',
  'billing',
  'upgrade',
  'relocation',
  'other',
] as const;

export type CanonicalRequestType = (typeof CANONICAL_REQUEST_TYPE_VALUES)[number];

/** Display labels shown on every surface (admin Requests, Support Tickets, officer field app). */
export type RequestTypeLabel =
  | 'New Connection'
  | 'Issue'
  | 'Relocation'
  | 'Upgrade'
  | 'Disconnection'
  | 'Billing'
  | 'Other';

const RAW_TO_CANONICAL: Record<string, CanonicalRequestType> = {
  installation: 'new_connection',
  'new connection': 'new_connection',
  new_connection: 'new_connection',
  repair: 'repair',
  complaint: 'repair',
  issue: 'repair',
  upgrade: 'upgrade',
  relocation: 'relocation',
  disconnection: 'disconnection',
  billing: 'billing',
  other: 'other',
};

export const REQUEST_TYPE_LABELS: Record<CanonicalRequestType, RequestTypeLabel> = {
  new_connection: 'New Connection',
  repair: 'Issue',
  disconnection: 'Disconnection',
  billing: 'Billing',
  upgrade: 'Upgrade',
  relocation: 'Relocation',
  other: 'Other',
};

const DISPLAY_LABELS = new Set<string>(Object.values(REQUEST_TYPE_LABELS));

export function normalizeRequestType(raw: unknown): CanonicalRequestType {
  if (!raw || typeof raw !== 'string') return 'other';
  const key = raw.trim().toLowerCase().replace(/\s+/g, '_');
  return RAW_TO_CANONICAL[key] ?? 'other';
}

export function formatRequestTypeLabel(raw: unknown): RequestTypeLabel {
  if (typeof raw === 'string' && DISPLAY_LABELS.has(raw)) {
    return raw as RequestTypeLabel;
  }
  return REQUEST_TYPE_LABELS[normalizeRequestType(raw)];
}

/** Map canonical type → legacy DB column value used in service_requests.request_type */
export function toDbRequestType(labelOrCanonical: unknown): string {
  const canonical = DISPLAY_LABELS.has(String(labelOrCanonical))
    ? Object.entries(REQUEST_TYPE_LABELS).find(([, v]) => v === labelOrCanonical)?.[0]
    : normalizeRequestType(labelOrCanonical);
  const dbMap: Record<CanonicalRequestType, string> = {
    new_connection: 'installation',
    repair: 'repair',
    upgrade: 'upgrade',
    relocation: 'relocation',
    disconnection: 'disconnection',
    billing: 'billing',
    other: 'complaint',
  };
  return dbMap[(canonical as CanonicalRequestType) ?? 'other'] ?? 'complaint';
}

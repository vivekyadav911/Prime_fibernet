import type { PortalTicketItem } from '@/types/portalTicket';

export type PortalItemCoordinates = {
  latitude: number;
  longitude: number;
  address: string;
};

function parseCoord(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function coordsFromRow(row: Record<string, unknown> | null | undefined): PortalItemCoordinates | null {
  if (!row) return null;
  const lat =
    parseCoord(row.latitude) ??
    parseCoord(row.location_lat);
  const lng =
    parseCoord(row.longitude) ??
    parseCoord(row.location_lng);
  if (lat == null || lng == null) return null;
  const address = String(row.location_address ?? row.address ?? '').trim();
  return { latitude: lat, longitude: lng, address };
}

/** Resolve map pin coordinates for a portal item (ticket via linked request row, or orphan request). */
export function getPortalItemCoordinates(
  item: PortalTicketItem,
  linkedRequestRow?: Record<string, unknown> | null,
): PortalItemCoordinates | null {
  if (linkedRequestRow) {
    const fromLinked = coordsFromRow(linkedRequestRow);
    if (fromLinked) return fromLinked;
  }

  if (item.request) {
    const raw = item.request as typeof item.request & {
      latitude?: number | null;
      longitude?: number | null;
      location_lat?: number | null;
      location_lng?: number | null;
    };
    const fromRequest = coordsFromRow(raw as unknown as Record<string, unknown>);
    if (fromRequest) return fromRequest;
  }

  return null;
}

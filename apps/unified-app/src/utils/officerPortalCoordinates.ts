import { z } from 'zod';

import type { PortalTicketItem } from '@/types/portalTicket';

export type PortalItemCoordinates = {
  latitude: number;
  longitude: number;
  address: string;
};

const coordinatePairSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

function parseCoord(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Reject out-of-range coords and 0,0 placeholders that break maps/navigation. */
export function isUsableMapCoordinate(latitude: number, longitude: number): boolean {
  const parsed = coordinatePairSchema.safeParse({ latitude, longitude });
  if (!parsed.success) return false;
  return !(Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001);
}

function coordsFromRow(row: Record<string, unknown> | null | undefined): PortalItemCoordinates | null {
  if (!row) return null;
  const lat =
    parseCoord(row.latitude) ??
    parseCoord(row.location_lat) ??
    parseCoord(row.lat);
  const lng =
    parseCoord(row.longitude) ??
    parseCoord(row.location_lng) ??
    parseCoord(row.lng);
  if (lat == null || lng == null || !isUsableMapCoordinate(lat, lng)) return null;
  const address = String(row.location_address ?? row.address ?? '').trim();
  return { latitude: lat, longitude: lng, address };
}

/** Resolve map pin coordinates for a portal item (ticket, linked request, or orphan request). */
export function getPortalItemCoordinates(
  item: PortalTicketItem,
  linkedRequestRow?: Record<string, unknown> | null,
  ticketRow?: Record<string, unknown> | null,
): PortalItemCoordinates | null {
  const fromLinked = coordsFromRow(linkedRequestRow);
  if (fromLinked) return fromLinked;

  const fromTicketRow = coordsFromRow(ticketRow);
  if (fromTicketRow) return fromTicketRow;

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

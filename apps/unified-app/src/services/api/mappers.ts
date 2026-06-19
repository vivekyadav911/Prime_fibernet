import type { Plan, RequestActivity, ServiceRequest } from '@prime/types';

import type { TypedSupabaseClient } from './supabase';

/** officers.user_id and officers.auth_user_id both reference users — hint PostgREST which FK to use. */
export const OFFICER_USERS_EMBED = 'users!user_id(name, email, phone)';
export const OFFICER_USERS_NAME_EMBED = 'users!user_id(name)';
export const OFFICER_ADMIN_SELECT = `*, ${OFFICER_USERS_EMBED}, officer_roles(name)`;

export function mapPlan(row: Record<string, unknown>): Plan {
  const speedFromLegacy =
    row.speed_mbps != null
      ? Number(row.speed_mbps)
      : parseInt(String(row.speed ?? '').replace(/\D/g, ''), 10) || 0;
  let features: string[] = [];
  if (Array.isArray(row.features)) features = row.features as string[];
  else if (row.features && typeof row.features === 'object') {
    features = Object.values(row.features as Record<string, unknown>).map(String);
  }

  return {
    id: row.id as string,
    name: row.name as string,
    speedMbps: speedFromLegacy,
    price: Number(row.price),
    priceQuarterly: row.price_quarterly != null ? Number(row.price_quarterly) : null,
    priceAnnual: row.price_annual != null ? Number(row.price_annual) : null,
    validityDays: Number(row.validity_days ?? 30),
    features,
    isActive: row.is_active as boolean,
    isFeatured: Boolean(row.is_featured),
    isUnlimited: Boolean(row.is_unlimited),
    dataLimitGb: row.data_limit_gb != null ? Number(row.data_limit_gb) : null,
  };
}

export function mapRequest(row: Record<string, unknown>): ServiceRequest {
  return {
    id: row.id as string,
    userId: (row.user_id as string) ?? '',
    officerId: (row.officer_id as string) ?? null,
    requestType: (row.request_type ?? row.type ?? 'installation') as ServiceRequest['requestType'],
    status: row.status as ServiceRequest['status'],
    priority: (row.priority as ServiceRequest['priority']) ?? 'P2',
    address: (row.address as string) ?? '',
    description: (row.description as string) ?? undefined,
    createdAt: row.created_at as string,
  };
}

export function mapRequestActivity(row: Record<string, unknown>): RequestActivity {
  return {
    id: row.id as string,
    requestId: row.request_id as string,
    note: (row.note ?? row.notes) as string | null,
    createdAt: (row.created_at ?? row.timestamp) as string,
  };
}

export async function getOfficerIdForUser(client: TypedSupabaseClient, userId: string): Promise<string | null> {
  const { data } = await client
    .from('officers')
    .select('id')
    .or(`user_id.eq.${userId},auth_user_id.eq.${userId}`)
    .maybeSingle();
  return data?.id ?? null;
}

export async function getCustomerIdForUser(client: TypedSupabaseClient, userId: string): Promise<string | null> {
  const { data } = await client
    .from('users')
    .select('id')
    .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
    .eq('role', 'customer')
    .maybeSingle();
  return data?.id ?? userId;
}

export async function fetchOfficerNameMap(
  client: TypedSupabaseClient,
  officerIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (officerIds.length === 0) return map;

  const { data, error } = await client
    .from('officers')
    .select(`id, full_name, email, ${OFFICER_USERS_NAME_EMBED}`)
    .in('id', officerIds);
  if (error) throw error;

  for (const officer of data ?? []) {
    const userName = (officer.users as { name?: string } | null)?.name;
    map.set(
      officer.id as string,
      (officer.full_name as string) ?? userName ?? (officer.email as string) ?? 'Officer',
    );
  }
  return map;
}

export function parseGeographyPoint(value: unknown): { latitude: number; longitude: number } | null {
  if (!value) return null;
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.coordinates && Array.isArray(obj.coordinates)) {
      const coords = obj.coordinates as number[];
      const lng = coords[0];
      const lat = coords[1];
      if (typeof lng === 'number' && typeof lat === 'number') {
        return { latitude: lat, longitude: lng };
      }
    }
    if (typeof obj.latitude === 'number' && typeof obj.longitude === 'number') {
      return { latitude: obj.latitude, longitude: obj.longitude };
    }
  }
  if (typeof value === 'string') {
    const match = value.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match?.[1] && match[2]) {
      return { latitude: parseFloat(match[2]), longitude: parseFloat(match[1]) };
    }
  }
  return null;
}

import type { Plan, RequestActivity, ServiceRequest } from '@prime/types';

import type { TypedSupabaseClient } from './supabase';

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
    validityDays: Number(row.validity_days ?? 30),
    features,
    isActive: row.is_active as boolean,
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

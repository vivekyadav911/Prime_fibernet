/**
 * Supabase migration (apply via supabase/migrations/20260614120000_plans_management_extend.sql):
 *
 * ALTER TABLE plans ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT '';
 * ALTER TABLE plans ADD COLUMN IF NOT EXISTS data_limit TEXT DEFAULT 'Unlimited';
 * ALTER TABLE plans ADD COLUMN IF NOT EXISTS router_type TEXT DEFAULT '';
 * ALTER TABLE plans ADD COLUMN IF NOT EXISTS plan_tag TEXT DEFAULT '';
 * ALTER TABLE plans ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'standard';
 * ALTER TABLE plans ADD COLUMN IF NOT EXISTS subscriber_count INTEGER DEFAULT 0;
 * ALTER TABLE plans ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT '';
 * ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
 * ALTER TABLE plans ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { getSupabase } from '@/services/supabase';
import type { Plan, PlanFilters, PlanFormData } from '@/types/plans';
import {
  applyPlanFilters,
  computePlanStats,
  encodeCreatedBy,
  formDataToDbPayload,
  mapDbRowToPlan,
} from '@/utils/planUtils';

const MIGRATION_FLAG_KEY = 'hasRunPlansMigration';

async function requireSession() {
  const client = getSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Please sign in to manage plans.');
  return { client, session: data.session };
}

function normalizeFormData(data: PlanFormData): {
  name: string;
  displayName: string;
  description: string;
  planTag: string;
  category: PlanFormData['category'];
  speedMbps: number;
  validityDays: number;
  price: number;
  dataLimit: string;
  routerType: string;
  features: string[];
  isActive: boolean;
  sortOrder: number;
} {
  return {
    name: data.name.trim(),
    displayName: data.displayName.trim(),
    description: data.description.trim(),
    planTag: data.planTag.trim(),
    category: data.category,
    speedMbps: Number(data.speedMbps),
    validityDays: Number(data.validityDays),
    price: Number(data.price),
    dataLimit: String(data.dataLimit),
    routerType: data.routerType.trim(),
    features: data.features.filter(Boolean),
    isActive: data.isActive,
    sortOrder: data.sortOrder === '' ? 0 : Number(data.sortOrder),
  };
}

export async function fetchPlans(filters?: Partial<PlanFilters>): Promise<Plan[]> {
  const { client } = await requireSession();

  // Prefer full query with extended columns; fall back for pre-migration schemas.
  let rows: Record<string, unknown>[] | null = null;

  const extended = await client
    .from('plans')
    .select('*')
    .eq('is_deleted', false)
    .order('sort_order', { ascending: true })
    .order('price', { ascending: true });

  if (!extended.error) {
    rows = (extended.data ?? []) as Record<string, unknown>[];
  } else {
    const legacy = await client.from('plans').select('*').order('price', { ascending: true });
    if (legacy.error) throw legacy.error;
    rows = (legacy.data ?? []) as Record<string, unknown>[];
  }

  const plans = rows.map((row) => mapDbRowToPlan(row)).filter((p) => !p.isDeleted);

  if (!filters) return plans;

  return applyPlanFilters(plans, {
    status: filters.status ?? 'all',
    speedMin: filters.speedMin ?? null,
    speedMax: filters.speedMax ?? null,
    priceMin: filters.priceMin ?? null,
    priceMax: filters.priceMax ?? null,
    category: filters.category ?? 'all',
    validityDays: filters.validityDays ?? null,
    searchQuery: filters.searchQuery ?? '',
    sortBy: filters.sortBy ?? 'sort_order',
  });
}

export async function fetchPlanById(id: string): Promise<Plan> {
  const { client } = await requireSession();
  const { data, error } = await client.from('plans').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Plan not found');
  return mapDbRowToPlan(data as Record<string, unknown>);
}

export async function createPlan(
  data: PlanFormData,
  admin: { id: string; name: string },
): Promise<Plan> {
  const { client } = await requireSession();
  const normalized = normalizeFormData(data);
  const payload = {
    ...formDataToDbPayload(normalized, encodeCreatedBy(admin.id, admin.name)),
    is_deleted: false,
    subscriber_count: 0,
    created_at: new Date().toISOString(),
  };

  const { data: inserted, error } = await client.from('plans').insert(payload).select('*').single();
  if (error) throw error;
  return mapDbRowToPlan(inserted as Record<string, unknown>);
}

export async function updatePlan(
  id: string,
  data: Partial<PlanFormData>,
  adminName: string,
): Promise<void> {
  const { client } = await requireSession();
  const existing = await fetchPlanById(id);

  const merged: PlanFormData = {
    name: data.name ?? existing.name,
    displayName: data.displayName ?? existing.displayName,
    description: data.description ?? existing.description,
    planTag: data.planTag ?? existing.planTag,
    category: data.category ?? existing.category,
    speedMbps: data.speedMbps ?? existing.speedMbps,
    validityDays: data.validityDays ?? existing.validityDays,
    price: data.price ?? existing.price,
    dataLimit: data.dataLimit ?? existing.dataLimit,
    routerType: data.routerType ?? existing.routerType,
    features: data.features ?? existing.features,
    isActive: data.isActive ?? existing.isActive,
    sortOrder: data.sortOrder ?? existing.sortOrder,
  };

  const normalized = normalizeFormData(merged);
  const payload = formDataToDbPayload(normalized, adminName);

  const { error } = await client.from('plans').update(payload).eq('id', id);
  if (error) throw error;
}

export async function togglePlanStatus(
  id: string,
  isActive: boolean,
  adminName: string,
): Promise<void> {
  const { client } = await requireSession();
  const { error } = await client
    .from('plans')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
      created_by: adminName,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deletePlan(id: string, adminName: string): Promise<void> {
  const { client } = await requireSession();
  const plan = await fetchPlanById(id);
  if (plan.subscriberCount > 0) {
    throw new Error('Cannot delete a plan with active subscribers.');
  }

  const { error } = await client
    .from('plans')
    .update({
      is_deleted: true,
      updated_at: new Date().toISOString(),
      created_by: adminName,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function duplicatePlan(
  id: string,
  newDisplayName: string,
  newPlanTag: string,
  adminName: string,
): Promise<Plan> {
  const source = await fetchPlanById(id);

  const formData: PlanFormData = {
    name: `Copy of ${source.name}`,
    displayName: newDisplayName.trim() || `Copy of ${source.displayName}`,
    description: source.description,
    planTag: newPlanTag.trim() || `${source.planTag}_copy`,
    category: source.category,
    speedMbps: source.speedMbps,
    validityDays: source.validityDays,
    price: source.price,
    dataLimit: source.dataLimit,
    routerType: source.routerType,
    features: [...source.features],
    isActive: source.isActive,
    sortOrder: source.sortOrder,
  };

  return createPlan(formData, { id: '', name: adminName });
}

export { computePlanStats };

export async function updateSubscriberCount(planId: string, delta: 1 | -1): Promise<void> {
  try {
    const { client } = await requireSession();
    const plan = await fetchPlanById(planId);
    const next = Math.max(0, plan.subscriberCount + delta);
    const { error } = await client
      .from('plans')
      .update({ subscriber_count: next, updated_at: new Date().toISOString() })
      .eq('id', planId);
    if (error) throw error;
  } catch (e) {
    console.warn('[planService] updateSubscriberCount failed:', e);
  }
}

export async function migratePlansCollection(): Promise<void> {
  const ran = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
  if (ran === 'true') return;

  const { client } = await requireSession();
  const { data: rows, error } = await client.from('plans').select('*');
  if (error) throw error;

  for (const row of rows ?? []) {
    const r = row as Record<string, unknown>;
    const patch: Record<string, unknown> = {};

    if (!r.display_name || String(r.display_name).trim() === '') {
      patch.display_name = r.name;
    }
    if (r.data_limit == null || String(r.data_limit).trim() === '') {
      patch.data_limit = 'Unlimited';
    }
    if (r.router_type == null) patch.router_type = '';
    if (r.plan_tag == null) patch.plan_tag = '';
    if (r.category == null || String(r.category).trim() === '') patch.category = 'standard';
    if (r.subscriber_count == null) {
      const planId = String(r.id);
      const { count } = await client
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('plan_id', planId)
        .eq('status', 'active');
      patch.subscriber_count = count ?? 0;
    }
    if (r.created_by == null) patch.created_by = '';
    if (r.is_deleted == null) patch.is_deleted = false;
    if (r.sort_order == null) patch.sort_order = 0;
    if (r.description == null) patch.description = '';

    if (Object.keys(patch).length > 0) {
      patch.updated_at = new Date().toISOString();
      const { error: updateError } = await client.from('plans').update(patch).eq('id', r.id);
      if (updateError) {
        // Extended columns may not exist yet — skip row-level patch until DB migration runs.
        console.warn('[planService] migratePlansCollection row patch skipped:', updateError.message);
      }
    }
  }

  await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
}

const plansRealtimeListeners = new Set<(plans: Plan[]) => void>();
let plansRealtimeChannel: RealtimeChannel | null = null;
let plansRealtimeFailed = false;

async function notifyPlansRealtimeListeners() {
  try {
    const plans = await fetchPlans();
    for (const listener of plansRealtimeListeners) {
      listener(plans);
    }
  } catch {
    // swallow — polling fallback handles refresh
  }
}

export function subscribeToPlans(callback: (plans: Plan[]) => void): () => void {
  if (plansRealtimeFailed) {
    return () => {};
  }

  const client = getSupabase();
  plansRealtimeListeners.add(callback);

  if (!plansRealtimeChannel) {
    plansRealtimeChannel = client
      .channel('admin-plans')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => {
        void notifyPlansRealtimeListeners();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          plansRealtimeFailed = true;
        }
      });
  }

  return () => {
    plansRealtimeListeners.delete(callback);
    if (plansRealtimeListeners.size === 0 && plansRealtimeChannel) {
      void client.removeChannel(plansRealtimeChannel);
      plansRealtimeChannel = null;
    }
  };
}

export function isPlansRealtimeAvailable(): boolean {
  return !plansRealtimeFailed;
}

export { getPlanDeactivationPrefill as getPlanDeactivationNotificationPrefill } from '@/utils/notificationUtils';

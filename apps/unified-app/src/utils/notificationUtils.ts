import type {
  AppNotification,
  AudienceConfig,
  AudienceType,
  CreateNotificationFormData,
  EventType,
  NotificationFilters,
  NotificationPriority,
  NotificationRecipient,
} from '@/types/notifications';
import { getSupabase } from '@/services/supabase';

const COUNT_CACHE = new Map<string, { count: number; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;
/** PostgREST default max rows per request */
const PAGE_SIZE = 1000;
const IN_QUERY_CHUNK = 200;

function cacheKey(audience: Omit<AudienceConfig, 'estimatedCount' | 'resolvedAt'>): string {
  return JSON.stringify(audience);
}

function getCachedCount(key: string): number | null {
  const entry = COUNT_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    COUNT_CACHE.delete(key);
    return null;
  }
  return entry.count;
}

function setCachedCount(key: string, count: number): void {
  COUNT_CACHE.set(key, { count, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateAudienceCountCache(): void {
  COUNT_CACHE.clear();
}

async function paginateIds(
  fetchPage: (from: number, to: number) => Promise<{ data: { id: string }[] | null; error: Error | null }>,
): Promise<string[]> {
  const ids: string[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    if (!page.length) break;
    ids.push(...page.map((row) => String(row.id)));
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return ids;
}

async function countAllCustomers(): Promise<number> {
  const client = getSupabase();
  const { count, error } = await client
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'customer')
    .eq('is_blocked', false);
  if (error) throw error;
  return count ?? 0;
}

async function fetchAllActiveSubscriptionUserIds(): Promise<Set<string>> {
  const client = getSupabase();
  const ids = new Set<string>();
  let from = 0;

  while (true) {
    const { data, error } = await client
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    if (!page.length) break;
    for (const row of page) {
      if (row.user_id) ids.add(String(row.user_id));
    }
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return ids;
}

async function countActiveCustomers(): Promise<number> {
  const activeSubUserIds = await fetchAllActiveSubscriptionUserIds();
  if (activeSubUserIds.size === 0) return 0;

  const client = getSupabase();
  const idList = [...activeSubUserIds];
  let total = 0;

  for (let i = 0; i < idList.length; i += IN_QUERY_CHUNK) {
    const chunk = idList.slice(i, i + IN_QUERY_CHUNK);
    const { count, error } = await client
      .from('users')
      .select('id', { count: 'exact', head: true })
      .in('id', chunk)
      .eq('role', 'customer')
      .eq('is_blocked', false);
    if (error) throw error;
    total += count ?? 0;
  }

  return total;
}

async function countCustomersByArea(area: string): Promise<number> {
  const client = getSupabase();
  const { count, error } = await client
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'customer')
    .ilike('city', area.trim());
  if (error) throw error;
  return count ?? 0;
}

async function countOfficers(): Promise<number> {
  const client = getSupabase();
  const { count, error } = await client.from('officers').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

async function countAdmins(): Promise<number> {
  const client = getSupabase();
  const { count, error } = await client
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin');
  if (error) throw error;
  return count ?? 0;
}

async function countAllStaff(): Promise<number> {
  const client = getSupabase();
  const { count, error } = await client
    .from('users')
    .select('id', { count: 'exact', head: true })
    .in('role', ['admin', 'officer']);
  if (error) throw error;
  return count ?? 0;
}

async function fetchCustomerIds(activeOnly?: boolean): Promise<string[]> {
  const client = getSupabase();
  const allIds = await paginateIds(async (from, to) => {
    const { data, error } = await client
      .from('users')
      .select('id')
      .eq('role', 'customer')
      .eq('is_blocked', false)
      .range(from, to);
    return { data: data as { id: string }[] | null, error };
  });

  if (activeOnly === undefined) return allIds;

  const activeSet = await fetchAllActiveSubscriptionUserIds();
  if (activeOnly) return allIds.filter((id) => activeSet.has(id));
  return allIds.filter((id) => !activeSet.has(id));
}

async function fetchUserIdsByPlan(planId: string): Promise<string[]> {
  const client = getSupabase();
  const ids = new Set<string>();
  let from = 0;

  while (true) {
    const { data, error } = await client
      .from('subscriptions')
      .select('user_id')
      .eq('plan_id', planId)
      .eq('status', 'active')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    if (!page.length) break;
    for (const row of page) {
      if (row.user_id) ids.add(String(row.user_id));
    }
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return [...ids];
}

async function fetchUserIdsByArea(area: string): Promise<string[]> {
  const client = getSupabase();
  return paginateIds(async (from, to) => {
    const { data, error } = await client
      .from('users')
      .select('id')
      .eq('role', 'customer')
      .ilike('city', area.trim())
      .range(from, to);
    return { data: data as { id: string }[] | null, error };
  });
}

async function fetchStaffUserIds(type: 'officers' | 'admins' | 'all_staff'): Promise<string[]> {
  const client = getSupabase();

  if (type === 'officers') {
    const ids = new Set<string>();
    let from = 0;
    while (true) {
      const { data, error } = await client
        .from('officers')
        .select('user_id')
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const page = data ?? [];
      if (!page.length) break;
      for (const row of page) {
        if (row.user_id) ids.add(String(row.user_id));
      }
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    return [...ids];
  }

  if (type === 'admins') {
    return paginateIds(async (from, to) => {
      const { data, error } = await client
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .range(from, to);
      return { data: data as { id: string }[] | null, error };
    });
  }

  return paginateIds(async (from, to) => {
    const { data, error } = await client
      .from('users')
      .select('id')
      .in('role', ['admin', 'officer'])
      .range(from, to);
    return { data: data as { id: string }[] | null, error };
  });
}

async function countAudienceByType(type: AudienceType, audience: Omit<AudienceConfig, 'estimatedCount' | 'resolvedAt'>): Promise<number> {
  switch (type) {
    case 'all_users':
      return countAllCustomers();
    case 'active_users':
      return countActiveCustomers();
    case 'inactive_users': {
      const [total, active] = await Promise.all([countAllCustomers(), countActiveCustomers()]);
      return Math.max(0, total - active);
    }
    case 'specific_plan':
      if (!audience.planId) return 0;
      return fetchUserIdsByPlan(audience.planId).then((ids) => ids.length);
    case 'specific_area':
      if (!audience.area?.trim()) return 0;
      return countCustomersByArea(audience.area);
    case 'specific_users':
      return audience.userIds?.length ?? 0;
    case 'officers':
      return countOfficers();
    case 'admins':
      return countAdmins();
    case 'all_staff':
      return countAllStaff();
    case 'custom_segment':
      return audience.userIds?.length ?? 0;
    default:
      return 0;
  }
}

async function resolveUserIds(audience: Omit<AudienceConfig, 'estimatedCount' | 'resolvedAt'>): Promise<string[]> {
  switch (audience.type) {
    case 'all_users':
      return fetchCustomerIds();
    case 'active_users':
      return fetchCustomerIds(true);
    case 'inactive_users':
      return fetchCustomerIds(false);
    case 'specific_plan':
      if (!audience.planId) return [];
      return fetchUserIdsByPlan(audience.planId);
    case 'specific_area':
      if (!audience.area?.trim()) return [];
      return fetchUserIdsByArea(audience.area);
    case 'specific_users':
      return audience.userIds ?? [];
    case 'officers':
      return fetchStaffUserIds('officers');
    case 'admins':
      return fetchStaffUserIds('admins');
    case 'all_staff':
      return fetchStaffUserIds('all_staff');
    case 'custom_segment':
      return audience.userIds ?? [];
    default:
      return [];
  }
}

export async function resolveAudienceCount(
  audience: Omit<AudienceConfig, 'estimatedCount' | 'resolvedAt'>,
  skipCache = false,
): Promise<number> {
  const key = cacheKey(audience);
  if (!skipCache) {
    const cached = getCachedCount(key);
    if (cached !== null) return cached;
  }
  const count = await countAudienceByType(audience.type, audience);
  setCachedCount(key, count);
  return count;
}

async function fetchPushTokensForUsers(userIds: string[]): Promise<Map<string, string>> {
  if (!userIds.length) return new Map();
  const client = getSupabase();
  const map = new Map<string, string>();

  for (let i = 0; i < userIds.length; i += IN_QUERY_CHUNK) {
    const chunk = userIds.slice(i, i + IN_QUERY_CHUNK);
    const { data, error } = await client
      .from('user_fcm_tokens')
      .select('user_id, token')
      .in('user_id', chunk)
      .eq('is_active', true);
    if (error) throw error;
    for (const row of data ?? []) {
      const uid = String(row.user_id);
      if (!map.has(uid)) map.set(uid, String(row.token));
    }
  }

  return map;
}

async function fetchUserMeta(userIds: string[]): Promise<Map<string, { name: string; role: string }>> {
  if (!userIds.length) return new Map();
  const client = getSupabase();
  const map = new Map<string, { name: string; role: string }>();

  for (let i = 0; i < userIds.length; i += IN_QUERY_CHUNK) {
    const chunk = userIds.slice(i, i + IN_QUERY_CHUNK);
    const { data, error } = await client.from('users').select('id, name, role').in('id', chunk);
    if (error) throw error;
    for (const row of data ?? []) {
      map.set(String(row.id), { name: String(row.name), role: String(row.role) });
    }
  }

  return map;
}

function mapRoleToUserType(role: string): 'customer' | 'officer' | 'admin' {
  if (role === 'officer') return 'officer';
  if (role === 'admin') return 'admin';
  return 'customer';
}

export async function resolveAudienceRecipients(
  audience: AudienceConfig,
): Promise<NotificationRecipient[]> {
  const userIds = [...new Set(await resolveUserIds(audience))];
  const [tokenMap, metaMap] = await Promise.all([
    fetchPushTokensForUsers(userIds),
    fetchUserMeta(userIds),
  ]);

  return userIds.map((userId) => {
    const meta = metaMap.get(userId);
    const name =
      audience.type === 'specific_users' && audience.userNames
        ? audience.userNames[audience.userIds?.indexOf(userId) ?? -1] ?? meta?.name ?? 'User'
        : meta?.name ?? 'User';
    const userType = mapRoleToUserType(meta?.role ?? 'customer');
    const pushToken = tokenMap.get(userId) ?? null;
    return {
      userId,
      userName: name,
      userType,
      pushToken,
      deliveryStatus: pushToken ? 'pending' : 'no_token',
    };
  });
}

export function formatAudienceLabel(audience: AudienceConfig): string {
  switch (audience.type) {
    case 'all_users':
      return 'All Users';
    case 'active_users':
      return 'Active Users';
    case 'inactive_users':
      return 'Inactive Users';
    case 'specific_plan':
      return audience.planName ? `${audience.planName} subscribers` : 'Specific Plan';
    case 'specific_area':
      return audience.area ? `Area: ${audience.area}` : 'Specific Area';
    case 'specific_users': {
      const n = audience.userIds?.length ?? audience.estimatedCount;
      return `${n} Specific User(s)`;
    }
    case 'officers':
      return 'Officers';
    case 'admins':
      return 'Admins';
    case 'all_staff':
      return 'All Staff';
    case 'custom_segment':
      return 'Custom Segment';
    default:
      return 'Unknown';
  }
}

export function formatEventType(type: EventType): string {
  const labels: Record<EventType, string> = {
    none: 'General',
    systemAlert: 'System Alert',
    accountUpdate: 'Account Update',
    promotional: 'Promotional',
    paymentReminder: 'Payment Reminder',
    maintenanceAlert: 'Maintenance Alert',
    planExpiry: 'Plan Expiry',
    newOffer: 'New Offer',
    serviceDisruption: 'Service Disruption',
    requestUpdate: 'Request Update',
    ticketUpdate: 'Ticket Update',
    welcomeMessage: 'Welcome Message',
    custom: 'Custom',
  };
  return labels[type] ?? type;
}

export function applyNotificationFilters(
  notifications: AppNotification[],
  filters: NotificationFilters,
): AppNotification[] {
  let result = [...notifications];

  if (filters.searchQuery.trim()) {
    const q = filters.searchQuery.trim().toLowerCase();
    result = result.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        formatAudienceLabel(n.audience).toLowerCase().includes(q) ||
        formatEventType(n.eventType).toLowerCase().includes(q),
    );
  }

  if (filters.priority !== 'all') {
    result = result.filter((n) => n.priority === filters.priority);
  }
  if (filters.eventType !== 'all') {
    result = result.filter((n) => n.eventType === filters.eventType);
  }
  if (filters.audienceType !== 'all') {
    result = result.filter((n) => n.audience.type === filters.audienceType);
  }
  if (filters.dateRange.from) {
    result = result.filter((n) => n.createdAt >= filters.dateRange.from!);
  }
  if (filters.dateRange.to) {
    const end = new Date(filters.dateRange.to);
    end.setHours(23, 59, 59, 999);
    result = result.filter((n) => n.createdAt <= end);
  }

  switch (filters.sortBy) {
    case 'oldest':
      result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      break;
    case 'title_az':
      result.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'newest':
    default:
      result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
  }

  return result;
}

export function countActiveFilters(filters: NotificationFilters): number {
  let count = 0;
  if (filters.priority !== 'all') count += 1;
  if (filters.eventType !== 'all') count += 1;
  if (filters.audienceType !== 'all') count += 1;
  if (filters.dateRange.from || filters.dateRange.to) count += 1;
  return count;
}

export function formatDeliveryRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function replaceTemplateVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}

export function getPlanDeactivationPrefill(
  planId: string,
  planName: string,
  subscriberCount: number,
): Partial<CreateNotificationFormData> {
  return {
    title: `Important update about ${planName}`,
    message: `We are making changes to the ${planName} plan. Please contact support if you have questions about your subscription.`,
    priority: 'High',
    eventType: 'accountUpdate',
    audience: {
      type: 'specific_plan',
      planId,
      planName,
    },
    schedule: { isScheduled: false, scheduledAt: null, timezone: 'Asia/Kolkata' },
    tags: ['plan-change'],
    deepLinkUrl: '',
    imageUrl: '',
    templateId: null,
  };
}

export function formatSentDateTime(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  return `${days[date.getDay()]}, ${d}/${m}/${y} ${hh}:${mm}`;
}

export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function priorityBadgeColors(priority: NotificationPriority): { bg: string; text: string } {
  switch (priority) {
    case 'Urgent':
      return { bg: '#EF4444', text: '#FFFFFF' };
    case 'High':
      return { bg: '#F97316', text: '#FFFFFF' };
    case 'Normal':
      return { bg: '#3B82F6', text: '#FFFFFF' };
    case 'Low':
    default:
      return { bg: '#9CA3AF', text: '#FFFFFF' };
  }
}

export function statusBadgeColor(status: AppNotification['status']): string {
  switch (status) {
    case 'sent':
      return '#10B981';
    case 'scheduled':
      return '#3B82F6';
    case 'draft':
      return '#9CA3AF';
    case 'failed':
    case 'partially_failed':
      return '#EF4444';
    case 'sending':
      return '#F59E0B';
    default:
      return '#6B7280';
  }
}

export function buildRecipientsCsv(recipients: NotificationRecipient[]): string {
  const header = 'User ID,Name,Type,Status,Push Token,Failure Reason,Sent At';
  const rows = recipients.map((r) =>
    [
      r.userId,
      `"${r.userName.replace(/"/g, '""')}"`,
      r.userType,
      r.deliveryStatus,
      r.pushToken ?? '',
      r.failureReason ?? '',
      r.sentAt?.toISOString() ?? '',
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

export function formDataToDbPayload(
  data: Partial<CreateNotificationFormData> & { estimatedCount?: number },
  admin: { id: string; name: string },
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    title: data.title ?? '',
    message: data.message ?? '',
    priority: data.priority ?? 'Normal',
    event_type: data.eventType ?? 'none',
    audience_type: data.audience?.type ?? 'all_users',
    audience_plan_id: data.audience?.planId ?? null,
    audience_plan_name: data.audience?.planName ?? null,
    audience_area: data.audience?.area ?? null,
    audience_user_ids: data.audience?.userIds ?? null,
    audience_user_names: data.audience?.userNames ?? null,
    audience_officer_ids: data.audience?.officerIds ?? null,
    audience_estimated_count: data.estimatedCount ?? 0,
    is_scheduled: data.schedule?.isScheduled ?? false,
    scheduled_at: data.schedule?.scheduledAt?.toISOString() ?? null,
    timezone: data.schedule?.timezone ?? 'Asia/Kolkata',
    tags: data.tags ?? [],
    deep_link_url: data.deepLinkUrl || null,
    image_url: data.imageUrl || null,
    created_by_id: admin.id,
    created_by_name: admin.name,
    updated_at: now,
    ...overrides,
  };
}

export type AudienceTypeOption = AudienceType;

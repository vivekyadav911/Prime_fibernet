import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;
const PAGE_SIZE = 1000;
const IN_QUERY_CHUNK = 200;

export type AudienceType =
  | 'all_users'
  | 'active_users'
  | 'inactive_users'
  | 'specific_plan'
  | 'specific_area'
  | 'specific_users'
  | 'officers'
  | 'admins'
  | 'all_staff'
  | 'custom_segment';

export type NotificationPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export interface AudienceConfig {
  type: AudienceType;
  planId?: string;
  area?: string;
  userIds?: string[];
  userNames?: string[];
  officerIds?: string[];
}

export interface NotificationRecipient {
  userId: string;
  userName: string;
  userType: 'customer' | 'officer' | 'admin';
  authUserId: string | null;
  pushToken: string | null;
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed' | 'no_token';
  failureReason?: string;
}

export interface DeliveryResult {
  totalTargeted: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  processingMs: number;
  failedTokens: string[];
  status: 'sent' | 'partially_failed' | 'failed';
}

type BroadcastRow = Record<string, unknown>;

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

async function fetchAllActiveSubscriptionUserIds(supabase: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
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

async function fetchCustomerIds(supabase: SupabaseClient, activeOnly?: boolean): Promise<string[]> {
  const allIds = await paginateIds(async (from, to) => {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'customer')
      .eq('is_blocked', false)
      .range(from, to);
    return { data: data as { id: string }[] | null, error };
  });

  if (activeOnly === undefined) return allIds;
  const activeSet = await fetchAllActiveSubscriptionUserIds(supabase);
  if (activeOnly) return allIds.filter((id) => activeSet.has(id));
  return allIds.filter((id) => !activeSet.has(id));
}

async function fetchUserIdsByPlan(supabase: SupabaseClient, planId: string): Promise<string[]> {
  const ids = new Set<string>();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
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

async function fetchUserIdsByArea(supabase: SupabaseClient, area: string): Promise<string[]> {
  return paginateIds(async (from, to) => {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'customer')
      .ilike('city', area.trim())
      .range(from, to);
    return { data: data as { id: string }[] | null, error };
  });
}

async function fetchStaffUserIds(
  supabase: SupabaseClient,
  type: 'officers' | 'admins' | 'all_staff',
): Promise<string[]> {
  if (type === 'officers') {
    const ids = new Set<string>();
    let from = 0;
    while (true) {
      const { data, error } = await supabase
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
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .range(from, to);
      return { data: data as { id: string }[] | null, error };
    });
  }

  return paginateIds(async (from, to) => {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'officer'])
      .range(from, to);
    return { data: data as { id: string }[] | null, error };
  });
}

export async function resolveUserIds(supabase: SupabaseClient, audience: AudienceConfig): Promise<string[]> {
  switch (audience.type) {
    case 'all_users':
      return fetchCustomerIds(supabase);
    case 'active_users':
      return fetchCustomerIds(supabase, true);
    case 'inactive_users':
      return fetchCustomerIds(supabase, false);
    case 'specific_plan':
      return audience.planId ? fetchUserIdsByPlan(supabase, audience.planId) : [];
    case 'specific_area':
      return audience.area?.trim() ? fetchUserIdsByArea(supabase, audience.area) : [];
    case 'specific_users':
      return audience.userIds ?? [];
    case 'officers':
      return fetchStaffUserIds(supabase, 'officers');
    case 'admins':
      return fetchStaffUserIds(supabase, 'admins');
    case 'all_staff':
      return fetchStaffUserIds(supabase, 'all_staff');
    case 'custom_segment':
      return audience.userIds ?? [];
    default:
      return [];
  }
}

function mapRoleToUserType(role: string): 'customer' | 'officer' | 'admin' {
  if (role === 'officer') return 'officer';
  if (role === 'admin') return 'admin';
  return 'customer';
}

async function fetchPushTokensForUsers(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, string>> {
  if (!userIds.length) return new Map();
  const map = new Map<string, string>();
  for (let i = 0; i < userIds.length; i += IN_QUERY_CHUNK) {
    const chunk = userIds.slice(i, i + IN_QUERY_CHUNK);
    const { data, error } = await supabase
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

async function fetchUserMeta(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, { name: string; role: string; authUserId: string | null }>> {
  if (!userIds.length) return new Map();
  const map = new Map<string, { name: string; role: string; authUserId: string | null }>();
  for (let i = 0; i < userIds.length; i += IN_QUERY_CHUNK) {
    const chunk = userIds.slice(i, i + IN_QUERY_CHUNK);
    const { data, error } = await supabase
      .from('users')
      .select('id, name, role, auth_user_id')
      .in('id', chunk);
    if (error) throw error;
    for (const row of data ?? []) {
      const authUserId = row.auth_user_id ? String(row.auth_user_id) : String(row.id);
      map.set(String(row.id), {
        name: String(row.name ?? 'User'),
        role: String(row.role ?? 'customer'),
        authUserId,
      });
    }
  }
  return map;
}

export async function resolveAudienceRecipients(
  supabase: SupabaseClient,
  audience: AudienceConfig,
): Promise<NotificationRecipient[]> {
  const userIds = [...new Set(await resolveUserIds(supabase, audience))];
  const [tokenMap, metaMap] = await Promise.all([
    fetchPushTokensForUsers(supabase, userIds),
    fetchUserMeta(supabase, userIds),
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
      authUserId: meta?.authUserId ?? null,
      pushToken,
      deliveryStatus: pushToken ? 'pending' : 'no_token',
    };
  });
}

function mapPriority(p: NotificationPriority): { priority: 'default' | 'high' | 'normal'; channelId: string } {
  if (p === 'Urgent') return { priority: 'high', channelId: 'urgent' };
  if (p === 'High') return { priority: 'high', channelId: 'default' };
  if (p === 'Low') return { priority: 'default', channelId: 'promotional' };
  return { priority: 'default', channelId: 'default' };
}

async function sendPushBatch(
  tokens: string[],
  title: string,
  body: string,
  priority: NotificationPriority,
  data?: Record<string, string>,
): Promise<{ sent: number; failed: number; failedTokens: string[] }> {
  const { priority: expoPriority, channelId } = mapPriority(priority);
  let sent = 0;
  let failed = 0;
  const failedTokens: string[] = [];

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const chunk = tokens.slice(i, i + BATCH_SIZE);
    const messages = chunk.map((token) => ({
      to: token,
      title,
      body,
      data,
      priority: expoPriority,
      sound: 'default',
      channelId,
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        failed += chunk.length;
        failedTokens.push(...chunk);
        continue;
      }
      const json = (await res.json()) as { data?: { status: string }[] } | { status: string }[];
      const tickets = Array.isArray(json) ? json : json.data ?? [];
      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'ok') sent += 1;
        else {
          failed += 1;
          failedTokens.push(chunk[idx] ?? '');
        }
      });
    } catch {
      failed += chunk.length;
      failedTokens.push(...chunk);
    }
  }

  return { sent, failed, failedTokens };
}

function rowToAudience(row: BroadcastRow): AudienceConfig {
  return {
    type: String(row.audience_type ?? 'all_users') as AudienceType,
    planId: row.audience_plan_id ? String(row.audience_plan_id) : undefined,
    area: row.audience_area ? String(row.audience_area) : undefined,
    userIds: Array.isArray(row.audience_user_ids)
      ? (row.audience_user_ids as string[]).map(String)
      : undefined,
    userNames: Array.isArray(row.audience_user_names)
      ? (row.audience_user_names as string[]).map(String)
      : undefined,
    officerIds: Array.isArray(row.audience_officer_ids)
      ? (row.audience_officer_ids as string[]).map(String)
      : undefined,
  };
}

async function isInAppEnabled(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase
    .from('general_settings')
    .select('notif_in_app')
    .limit(1)
    .maybeSingle();
  return data?.notif_in_app !== false;
}

async function isPushEnabled(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase
    .from('general_settings')
    .select('notif_push')
    .limit(1)
    .maybeSingle();
  return data?.notif_push !== false;
}

export async function deliverBroadcastNotification(
  supabase: SupabaseClient,
  notificationId: string,
  options?: { skipPush?: boolean; skipInApp?: boolean },
): Promise<DeliveryResult> {
  const startMs = Date.now();

  const { data: row, error: fetchErr } = await supabase
    .from('broadcast_notifications')
    .select('*')
    .eq('id', notificationId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!row) throw new Error('Notification not found');

  const notification = row as BroadcastRow;
  const title = String(notification.title ?? '');
  const message = String(notification.message ?? '');
  const priority = String(notification.priority ?? 'Normal') as NotificationPriority;
  const eventType = String(notification.event_type ?? 'none');
  const deepLinkUrl = notification.deep_link_url ? String(notification.deep_link_url) : undefined;
  const tags = Array.isArray(notification.tags) ? (notification.tags as string[]) : [];
  const isTest = Boolean(notification.is_test) || tags.includes('test');

  await supabase
    .from('broadcast_notifications')
    .update({ status: 'sending', is_draft: false, updated_at: new Date().toISOString() })
    .eq('id', notificationId);

  const audience = rowToAudience(notification);
  const recipients = await resolveAudienceRecipients(supabase, audience);
  const totalTargeted = recipients.length;

  const pushEnabled = !options?.skipPush && (await isPushEnabled(supabase));
  const inAppEnabled = !options?.skipInApp && (await isInAppEnabled(supabase));

  const withTokens = recipients.filter((r) => r.pushToken);
  const tokens = pushEnabled ? withTokens.map((r) => r.pushToken!) : [];

  const pushData: Record<string, string> = { notificationId, eventType };
  if (deepLinkUrl) pushData.deepLinkUrl = deepLinkUrl;

  let sentCount = 0;
  let failedCount = 0;
  const failedTokens: string[] = [];

  if (tokens.length) {
    const result = await sendPushBatch(tokens, title, message, priority, pushData);
    sentCount = result.sent;
    failedCount = result.failed;
    failedTokens.push(...result.failedTokens);
  }

  if (inAppEnabled) {
    const portalRows = recipients
      .filter((r) => r.authUserId)
      .map((r) => ({
        recipient_auth_id: r.authUserId!,
        type: eventType,
        title,
        body: message,
        is_test: isTest,
        data: {
          notificationId,
          deepLinkUrl: deepLinkUrl ?? null,
          broadcast: true,
        },
      }));
    if (portalRows.length) {
      const { error: portalErr } = await supabase.from('portal_notifications').insert(portalRows);
      if (portalErr) console.error('portal_notifications insert error:', portalErr.message);
    }
  }

  const noTokenCount = recipients.filter((r) => !r.pushToken).length;
  const now = new Date().toISOString();
  const tokenIndex = new Map(withTokens.map((r, i) => [r.userId, i]));

  const recipientRows = recipients.map((r) => {
    let deliveryStatus = r.deliveryStatus;
    let failureReason: string | undefined;
    if (!r.pushToken) {
      deliveryStatus = inAppEnabled && r.authUserId ? 'delivered' : 'no_token';
    } else if (!pushEnabled) {
      deliveryStatus = inAppEnabled ? 'delivered' : 'no_token';
    } else {
      const failed = r.pushToken && failedTokens.includes(r.pushToken);
      if (failed) {
        deliveryStatus = 'failed';
        failureReason = 'Push delivery failed';
      } else {
        deliveryStatus = 'delivered';
      }
    }
    void tokenIndex;
    return {
      notification_id: notificationId,
      user_id: r.userId,
      user_name: r.userName,
      user_type: r.userType,
      push_token: r.pushToken,
      delivery_status: deliveryStatus,
      failure_reason: failureReason ?? null,
      sent_at: r.pushToken && pushEnabled ? now : inAppEnabled && r.authUserId ? now : null,
    };
  });

  await supabase.from('notification_recipients').delete().eq('notification_id', notificationId);
  if (recipientRows.length) {
    const { error: recErr } = await supabase.from('notification_recipients').insert(recipientRows);
    if (recErr) throw recErr;
  }

  const totalDelivered = pushEnabled ? sentCount : inAppEnabled ? recipients.filter((r) => r.authUserId).length : 0;
  const totalFailed = pushEnabled ? failedCount + (pushEnabled ? noTokenCount : 0) : 0;
  const deliveryRate = tokens.length ? sentCount / tokens.length : totalTargeted > 0 && inAppEnabled ? 1 : 0;
  const processingMs = Date.now() - startMs;

  let status: DeliveryResult['status'] = 'sent';
  if (totalDelivered === 0 && totalTargeted > 0) status = 'failed';
  else if (totalFailed > 0 && totalDelivered > 0) status = 'partially_failed';

  const { error: updateErr } = await supabase
    .from('broadcast_notifications')
    .update({
      status,
      is_draft: false,
      sent_at: now,
      total_targeted: totalTargeted,
      total_sent: tokens.length,
      total_delivered: totalDelivered,
      total_failed: totalFailed,
      delivery_rate: deliveryRate,
      processing_ms: processingMs,
      failed_tokens: failedTokens,
      audience_estimated_count: totalTargeted,
      updated_at: now,
    })
    .eq('id', notificationId);
  if (updateErr) throw updateErr;

  return {
    totalTargeted,
    totalSent: tokens.length,
    totalDelivered,
    totalFailed,
    deliveryRate,
    processingMs,
    failedTokens,
    status,
  };
}

export function replaceTemplateVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}

export async function verifyAdminAccess(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<boolean> {
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .or(`id.eq.${authUserId},auth_user_id.eq.${authUserId}`)
    .maybeSingle();
  if (userRow?.role === 'admin') return true;

  const { data: adminRow } = await supabase
    .from('admins')
    .select('id')
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)
    .maybeSingle();
  return Boolean(adminRow);
}

export async function recoverStuckSending(supabase: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('broadcast_notifications')
    .select('id')
    .eq('status', 'sending')
    .lt('updated_at', cutoff);
  if (error) throw error;
  if (!data?.length) return 0;

  const ids = data.map((r) => String(r.id));
  const { error: updateErr } = await supabase
    .from('broadcast_notifications')
    .update({ status: 'partially_failed', updated_at: new Date().toISOString() })
    .in('id', ids);
  if (updateErr) throw updateErr;
  return ids.length;
}

function computeNextRunAt(
  frequency: string,
  timeOfDay: string,
  timezone: string,
  dayOfWeek?: number | null,
): Date {
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  const now = new Date();
  const next = new Date(now);
  next.setHours(hours ?? 9, minutes ?? 0, 0, 0);

  if (frequency === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  }

  if (frequency === 'weekly') {
    const targetDow = dayOfWeek ?? 1;
    const currentDow = next.getDay();
    let daysUntil = (targetDow - currentDow + 7) % 7;
    if (daysUntil === 0 && next <= now) daysUntil = 7;
    next.setDate(next.getDate() + daysUntil);
    return next;
  }

  if (frequency === 'monthly') {
    const targetDay = dayOfWeek ?? 1;
    next.setDate(targetDay);
    if (next <= now) next.setMonth(next.getMonth() + 1);
    return next;
  }

  if (next <= now) next.setDate(next.getDate() + 1);
  void timezone;
  return next;
}

export { computeNextRunAt };

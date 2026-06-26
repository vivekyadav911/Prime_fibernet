import type { SupabaseClient } from '@supabase/supabase-js';

type OfficerNotificationPayload = {
  officerId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  category?: string;
};

/**
 * Inserts a portal_notifications row for an officer.
 *
 * Resolves the officer's Supabase auth_user_id from the officers table so that
 * both recipient_officer_id and recipient_auth_id are set correctly. The
 * recipient_auth_id is required for the officer's own SELECT/UPDATE RLS
 * policies.
 *
 * Silently skips the insert if the officer row is not found (avoids crashing
 * the parent operation when a notification is non-critical).
 */
export async function insertOfficerPortalNotification(
  client: SupabaseClient,
  payload: OfficerNotificationPayload,
): Promise<void> {
  const { data: officerRow } = await client
    .from('officers')
    .select('auth_user_id')
    .eq('id', payload.officerId)
    .maybeSingle();

  if (!officerRow?.auth_user_id) return;

  await client.from('portal_notifications').insert({
    recipient_officer_id: payload.officerId,
    recipient_auth_id: officerRow.auth_user_id as string,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    category: payload.category ?? null,
    is_read: false,
  });
}

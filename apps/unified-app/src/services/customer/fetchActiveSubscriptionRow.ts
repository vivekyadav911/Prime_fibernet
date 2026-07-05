import type { SupabaseClient } from '@supabase/supabase-js';

import {
  activeSubscriptionCutoffDate,
  CURRENT_SUBSCRIPTION_STATUSES,
} from '@/services/customer/activeSubscription';

/** Join all available plan columns — avoids hard-failing when optional migrations are missing. */
const ACTIVE_SUBSCRIPTION_SELECT = '*, plans!inner(*)';

/** Latest active/suspended subscription row for a customer, or null. */
export async function fetchActiveSubscriptionRow(
  client: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await client
    .from('subscriptions')
    .select(ACTIVE_SUBSCRIPTION_SELECT)
    .eq('user_id', userId)
    .in('status', CURRENT_SUBSCRIPTION_STATUSES)
    .gte('end_at', activeSubscriptionCutoffDate())
    .order('end_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as Record<string, unknown> | null;
}

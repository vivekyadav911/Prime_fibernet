import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { useOfficerId } from '@/hooks/useOfficerId';
import { officerPortalApi } from '@/services/api/officerPortalApi';
import { requestsApi } from '@/services/api/requestsApi';
import { getSupabase } from '@/services/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const channelsByOfficerId = new Map<string, RealtimeChannel>();
const subscriberCounts = new Map<string, number>();

function channelName(officerId: string): string {
  return `officer-tickets-sync-${officerId}`;
}

function invalidate(dispatch: ReturnType<typeof useAppDispatch>) {
  dispatch(officerPortalApi.util.invalidateTags(['OfficerPortal']));
  dispatch(requestsApi.util.invalidateTags(['Requests']));
}

function ensureChannel(
  officerId: string,
  authUserId: string,
  dispatch: ReturnType<typeof useAppDispatch>,
): RealtimeChannel {
  const existing = channelsByOfficerId.get(officerId);
  if (existing) return existing;

  const client = getSupabase();
  const channel = client
    .channel(channelName(officerId))
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tickets',
        filter: `assigned_officer_id=eq.${officerId}`,
      },
      () => invalidate(dispatch),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ticket_activity_events',
      },
      () => invalidate(dispatch),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'service_requests',
        filter: `officer_id=eq.${officerId}`,
      },
      () => invalidate(dispatch),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'request_activities',
      },
      () => invalidate(dispatch),
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'portal_notifications',
        filter: `recipient_auth_id=eq.${authUserId}`,
      },
      () => invalidate(dispatch),
    )
    .subscribe();

  channelsByOfficerId.set(officerId, channel);
  return channel;
}

function releaseChannel(officerId: string): void {
  const count = subscriberCounts.get(officerId) ?? 0;
  if (count > 0) return;

  const channel = channelsByOfficerId.get(officerId);
  if (!channel) return;

  void getSupabase().removeChannel(channel);
  channelsByOfficerId.delete(officerId);
}

/** Live sync for officer-assigned tickets and linked service requests. */
export function useOfficerTicketsSync() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const role = useAppSelector((s) => s.auth.user?.role);
  const authUserId = useAppSelector((s) => s.auth.user?.id);
  const officerId = useOfficerId();

  useEffect(() => {
    if (!isAuthenticated || role !== 'officer' || !officerId || !authUserId) return;

    const prev = subscriberCounts.get(officerId) ?? 0;
    subscriberCounts.set(officerId, prev + 1);
    ensureChannel(officerId, authUserId, dispatch);

    return () => {
      const next = Math.max(0, (subscriberCounts.get(officerId) ?? 1) - 1);
      subscriberCounts.set(officerId, next);
      releaseChannel(officerId);
    };
  }, [authUserId, dispatch, isAuthenticated, officerId, role]);
}

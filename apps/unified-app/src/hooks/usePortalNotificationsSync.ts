import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { portalNotificationsApi } from '@/services/api/portalNotificationsApi';
import { employmentContractsApi } from '@/services/api/employmentContractsApi';
import { getSupabase } from '@/services/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const channelsByUserId = new Map<string, RealtimeChannel>();
const subscriberCounts = new Map<string, number>();

function channelName(userId: string): string {
  return `notif-${userId}`;
}

function ensureChannel(
  userId: string,
  dispatch: ReturnType<typeof useAppDispatch>,
): RealtimeChannel {
  const existing = channelsByUserId.get(userId);
  if (existing) return existing;

  const client = getSupabase();
  const channel = client
    .channel(channelName(userId))
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'portal_notifications',
        filter: `recipient_auth_id=eq.${userId}`,
      },
      () => {
        dispatch(portalNotificationsApi.util.invalidateTags(['PortalNotifications']));
        dispatch(
          employmentContractsApi.util.invalidateTags([{ type: 'EmploymentContracts', id: 'SELF' }]),
        );
      },
    )
    .subscribe();

  channelsByUserId.set(userId, channel);
  return channel;
}

function releaseChannel(userId: string): void {
  const count = subscriberCounts.get(userId) ?? 0;
  if (count > 0) return;

  const channel = channelsByUserId.get(userId);
  if (!channel) return;

  void getSupabase().removeChannel(channel);
  channelsByUserId.delete(userId);
}

export function usePortalNotificationsSync() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((s) => s.auth.user?.id);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const prev = subscriberCounts.get(userId) ?? 0;
    subscriberCounts.set(userId, prev + 1);
    ensureChannel(userId, dispatch);

    return () => {
      const next = Math.max(0, (subscriberCounts.get(userId) ?? 1) - 1);
      subscriberCounts.set(userId, next);
      releaseChannel(userId);
    };
  }, [dispatch, isAuthenticated, userId]);
}

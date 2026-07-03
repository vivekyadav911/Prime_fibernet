import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { baseApi } from '@/services/api/baseApi';
import { useGetCustomerProfileQuery } from '@/services/api/authApi';
import { getSupabase } from '@/services/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useCustomerUiStore } from '@/store/customerUiStore';

type UseRealtimeCustomerOptions = {
  chatSessionId?: string | null;
  enabled?: boolean;
};

const channelsByKey = new Map<string, RealtimeChannel[]>();
const subscriberCounts = new Map<string, number>();

function sessionKey(
  authUserId: string,
  customerUserId: string,
  chatSessionId: string | null,
): string {
  return `${authUserId}|${customerUserId}|${chatSessionId ?? ''}`;
}

function ensureChannels(
  key: string,
  authUserId: string,
  customerUserId: string,
  chatSessionId: string | null,
  dispatch: ReturnType<typeof useAppDispatch>,
  showToast: (title: string, body?: string) => void,
): void {
  if (channelsByKey.has(key)) return;

  const client = getSupabase();
  const channels: RealtimeChannel[] = [];

  const invalidate = () => {
    dispatch(
      baseApi.util.invalidateTags([
        'CustomerDashboard',
        'PortalNotifications',
        'CustomerTickets',
        'Subscriptions',
        'Payments',
        'PlanChangeRequests',
      ]),
    );
  };

  if (authUserId) {
    channels.push(
      client
        .channel(`customer-notifications-${authUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'portal_notifications',
            filter: `recipient_auth_id=eq.${authUserId}`,
          },
          (payload) => {
            const row = payload.new as { title?: string; body?: string };
            showToast(row.title ?? 'New notification', row.body ?? undefined);
            invalidate();
          },
        )
        .subscribe(),
    );
  }

  if (customerUserId) {
    channels.push(
      client
        .channel(`my-tickets-${customerUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tickets',
            filter: `customer_id=eq.${customerUserId}`,
          },
          () => invalidate(),
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tickets',
            filter: `customer_id=eq.${customerUserId}`,
          },
          () => invalidate(),
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ticket_activity_events',
          },
          () => invalidate(),
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ticket_customer_messages',
          },
          () => invalidate(),
        )
        .subscribe(),
      client
        .channel(`my-payments-${customerUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'payments',
            filter: `customer_id=eq.${customerUserId}`,
          },
          () => invalidate(),
        )
        .subscribe(),
      client
        .channel(`dashboard-subscriptions-${customerUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'subscriptions',
            filter: `user_id=eq.${customerUserId}`,
          },
          () => invalidate(),
        )
        .subscribe(),
    );
  }

  if (chatSessionId) {
    channels.push(
      client
        .channel(`chat-${chatSessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `session_id=eq.${chatSessionId}`,
          },
          () => invalidate(),
        )
        .subscribe(),
    );
  }

  channelsByKey.set(key, channels);
}

function releaseChannels(key: string): void {
  const channels = channelsByKey.get(key);
  if (!channels) return;

  const client = getSupabase();
  channels.forEach((ch) => void client.removeChannel(ch));
  channelsByKey.delete(key);
}

export function useRealtimeCustomer(options: UseRealtimeCustomerOptions = {}) {
  const { chatSessionId = null, enabled = true } = options;
  const authUserId = useAppSelector((s) => s.auth.session?.user?.id ?? s.auth.user?.id ?? '');
  const { data: profile } = useGetCustomerProfileQuery(undefined, { skip: !authUserId });
  const customerUserId = profile?.id ?? '';
  const dispatch = useAppDispatch();
  const showToast = useCustomerUiStore((s) => s.showToast);

  useEffect(() => {
    if (!enabled || (!authUserId && !customerUserId)) return;

    const key = sessionKey(authUserId, customerUserId, chatSessionId);
    const prev = subscriberCounts.get(key) ?? 0;
    subscriberCounts.set(key, prev + 1);

    if (prev === 0) {
      ensureChannels(key, authUserId, customerUserId, chatSessionId, dispatch, showToast);
    }

    return () => {
      const next = Math.max(0, (subscriberCounts.get(key) ?? 1) - 1);
      subscriberCounts.set(key, next);
      if (next === 0) {
        releaseChannels(key);
      }
    };
  }, [authUserId, chatSessionId, customerUserId, dispatch, enabled, showToast]);
}

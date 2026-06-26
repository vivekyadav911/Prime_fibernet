import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { useOfficerId } from '@/hooks/useOfficerId';
import { paymentCollectionApi } from '@/services/api/paymentCollectionApi';
import { getSupabase } from '@/services/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const channelsByOfficerId = new Map<string, RealtimeChannel>();
const subscriberCounts = new Map<string, number>();

function channelName(officerId: string): string {
  return `officer-collections-sync-${officerId}`;
}

function ensureChannel(
  officerId: string,
  dispatch: ReturnType<typeof useAppDispatch>,
): RealtimeChannel {
  const existing = channelsByOfficerId.get(officerId);
  if (existing) return existing;

  const client = getSupabase();
  const invalidate = () => {
    dispatch(paymentCollectionApi.util.invalidateTags(['Payments']));
  };

  const channel = client
    .channel(channelName(officerId))
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `assigned_officer_id=eq.${officerId}`,
      },
      invalidate,
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
      },
      (payload) => {
        const prev = payload.old as {
          assigned_officer_id?: string | null;
          claimed_by_officer_id?: string | null;
          collection_status?: string | null;
        };
        const next = payload.new as {
          assigned_officer_id?: string | null;
          claimed_by_officer_id?: string | null;
          collection_status?: string | null;
        };
        if (
          prev.assigned_officer_id === officerId ||
          next.assigned_officer_id === officerId ||
          prev.claimed_by_officer_id === officerId ||
          next.claimed_by_officer_id === officerId ||
          (next.assigned_officer_id == null &&
            (next.claimed_by_officer_id == null || next.claimed_by_officer_id === officerId))
        ) {
          invalidate();
        }
      },
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

export function useOfficerCollectionsSync() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const role = useAppSelector((s) => s.auth.user?.role);
  const officerId = useOfficerId();

  useEffect(() => {
    if (!isAuthenticated || role !== 'officer' || !officerId) return;

    const prev = subscriberCounts.get(officerId) ?? 0;
    subscriberCounts.set(officerId, prev + 1);
    ensureChannel(officerId, dispatch);

    return () => {
      const next = Math.max(0, (subscriberCounts.get(officerId) ?? 1) - 1);
      subscriberCounts.set(officerId, next);
      releaseChannel(officerId);
    };
  }, [dispatch, isAuthenticated, officerId, role]);
}

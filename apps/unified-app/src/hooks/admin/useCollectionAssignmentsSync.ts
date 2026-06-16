import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { collectionAssignmentsApi } from '@/services/api/collectionAssignmentsApi';
import { paymentCollectionApi } from '@/services/api/paymentCollectionApi';
import { getSupabase } from '@/services/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const CHANNEL_NAME = 'admin-collection-assignments';

let sharedChannel: RealtimeChannel | null = null;
let subscriberCount = 0;

function ensureChannel(dispatch: ReturnType<typeof useAppDispatch>): RealtimeChannel {
  if (sharedChannel) return sharedChannel;

  const client = getSupabase();
  sharedChannel = client
    .channel(CHANNEL_NAME)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'users' },
      (payload) => {
        const next = payload.new as {
          assigned_officer_id?: string | null;
          collection_status?: string | null;
          claimed_by_officer_id?: string | null;
        };
        const prev = payload.old as {
          assigned_officer_id?: string | null;
          collection_status?: string | null;
          claimed_by_officer_id?: string | null;
        };
        if (
          next.assigned_officer_id !== prev.assigned_officer_id ||
          next.collection_status !== prev.collection_status ||
          next.claimed_by_officer_id !== prev.claimed_by_officer_id
        ) {
          dispatch(
            collectionAssignmentsApi.util.invalidateTags(['CollectionAssignments', 'Users']),
          );
          dispatch(paymentCollectionApi.util.invalidateTags(['Payments', 'Analytics']));
        }
      },
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'payments' },
      () => {
        dispatch(paymentCollectionApi.util.invalidateTags(['Payments', 'Analytics']));
      },
    )
    .subscribe();

  return sharedChannel;
}

function releaseChannel(): void {
  if (subscriberCount > 0 || !sharedChannel) return;
  void getSupabase().removeChannel(sharedChannel);
  sharedChannel = null;
}

export function useCollectionAssignmentsSync() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const role = useAppSelector((s) => s.auth.user?.role);

  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') return;

    subscriberCount += 1;
    ensureChannel(dispatch);

    return () => {
      subscriberCount = Math.max(0, subscriberCount - 1);
      releaseChannel();
    };
  }, [dispatch, isAuthenticated, role]);
}

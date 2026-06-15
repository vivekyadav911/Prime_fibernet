import { useEffect } from 'react';

import { useOfficerId } from '@/hooks/useOfficerId';
import { paymentCollectionApi } from '@/services/api/paymentCollectionApi';
import { getSupabase } from '@/services/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

export function useOfficerCollectionsSync() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const role = useAppSelector((s) => s.auth.user?.role);
  const officerId = useOfficerId();

  useEffect(() => {
    if (!isAuthenticated || role !== 'officer' || !officerId) return;

    const client = getSupabase();
    const invalidate = () => {
      dispatch(paymentCollectionApi.util.invalidateTags(['Payments']));
    };

    const channel = client
      .channel(`officer-collections-sync-${officerId}`)
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
          const prev = payload.old as { assigned_officer_id?: string | null };
          const next = payload.new as { assigned_officer_id?: string | null };
          if (
            prev.assigned_officer_id === officerId ||
            next.assigned_officer_id === officerId
          ) {
            invalidate();
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [dispatch, isAuthenticated, officerId, role]);
}

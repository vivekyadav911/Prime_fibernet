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

    const assignedChannel = client
      .channel(`officer-collections-assigned-${officerId}`)
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
      .subscribe();

    const openPoolChannel = client
      .channel('officer-collections-open-pool')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: 'assigned_officer_id=is.null',
        },
        invalidate,
      )
      .subscribe();

    const unassignChannel = client
      .channel(`officer-collections-unassign-${officerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
        },
        (payload) => {
          const prev = payload.old as { assigned_officer_id?: string | null };
          if (prev.assigned_officer_id === officerId) {
            invalidate();
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(assignedChannel);
      void client.removeChannel(openPoolChannel);
      void client.removeChannel(unassignChannel);
    };
  }, [dispatch, isAuthenticated, officerId, role]);
}

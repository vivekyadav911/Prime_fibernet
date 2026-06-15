import { useEffect } from 'react';

import { collectionAssignmentsApi } from '@/services/api/collectionAssignmentsApi';
import { paymentCollectionApi } from '@/services/api/paymentCollectionApi';
import { getSupabase } from '@/services/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

export function useCollectionAssignmentsSync() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const role = useAppSelector((s) => s.auth.user?.role);

  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') return;

    const client = getSupabase();
    const channel = client
      .channel('admin-collection-assignments')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users' },
        (payload) => {
          const next = payload.new as { assigned_officer_id?: string | null };
          const prev = payload.old as { assigned_officer_id?: string | null };
          if (next.assigned_officer_id !== prev.assigned_officer_id) {
            dispatch(
              collectionAssignmentsApi.util.invalidateTags(['CollectionAssignments', 'Users']),
            );
            dispatch(paymentCollectionApi.util.invalidateTags(['Payments']));
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [dispatch, isAuthenticated, role]);
}

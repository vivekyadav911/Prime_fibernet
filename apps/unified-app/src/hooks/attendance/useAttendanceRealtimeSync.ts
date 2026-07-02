import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { attendanceApi } from '@/services/api/attendanceApi';
import { getSupabase } from '@/services/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

let adminChannel: RealtimeChannel | null = null;
let subscriberCount = 0;

function ensureAdminAttendanceChannel(dispatch: ReturnType<typeof useAppDispatch>): RealtimeChannel {
  if (adminChannel) return adminChannel;

  const client = getSupabase();
  const invalidate = () => {
    dispatch(attendanceApi.util.invalidateTags(['Attendance', 'Approvals', 'Geofences', 'Map']));
  };

  adminChannel = client
    .channel('admin-attendance-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'shifts' },
      invalidate,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'attendance_approval_requests' },
      invalidate,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'geofence_officer_assignments' },
      invalidate,
    )
    .subscribe();

  return adminChannel;
}

function releaseAdminChannel(): void {
  if (subscriberCount > 0 || !adminChannel) return;
  void getSupabase().removeChannel(adminChannel);
  adminChannel = null;
}

/** Subscribes admin attendance screens to Supabase Realtime invalidation. */
export function useAttendanceRealtimeSync(enabled = true) {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.user?.role);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  useEffect(() => {
    if (!enabled || !isAuthenticated || role !== 'admin') return;

    subscriberCount += 1;
    ensureAdminAttendanceChannel(dispatch);

    return () => {
      subscriberCount = Math.max(0, subscriberCount - 1);
      releaseAdminChannel();
    };
  }, [dispatch, enabled, isAuthenticated, role]);
}

import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { attendanceApi } from '@/services/api/attendanceApi';
import { portalNotificationsApi } from '@/services/api/portalNotificationsApi';
import { notificationService, NotificationType } from '@/services/NotificationService';
import { getSupabase } from '@/services/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';

/**
 * Officer-side realtime: refresh attendance/approvals and surface approve/decline.
 */
export function useOfficerAttendanceRealtimeSync(enabled = true) {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.user?.role);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || !isAuthenticated || role !== 'officer') return;

    const client = getSupabase();
    let channel: RealtimeChannel | null = null;

    channel = client
      .channel(`officer-attendance-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts' },
        () => {
          dispatch(attendanceApi.util.invalidateTags(['Attendance', 'Shifts']));
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'attendance_approval_requests' },
        (payload) => {
          dispatch(attendanceApi.util.invalidateTags(['Approvals', 'Attendance', 'Shifts']));
          dispatch(portalNotificationsApi.util.invalidateTags(['PortalNotifications']));

          const row = payload.new as {
            id?: string;
            status?: string;
            type?: string;
            review_notes?: string | null;
          };
          if (!row?.id || !row.status) return;
          if (row.status !== 'approved' && row.status !== 'rejected') return;

          const key = `${row.id}:${row.status}`;
          if (seenRef.current.has(key)) return;
          seenRef.current.add(key);

          if (row.status === 'approved') {
            const msg =
              row.type === 'out_of_zone_checkout'
                ? 'Check-out approved — shift completed.'
                : 'Approval granted — you are clocked in.';
            dispatch(
              enqueueToast({ id: `toast-${Date.now()}`, type: 'success', message: msg }),
            );
            void notificationService.sendLocalNotification({
              title: 'Attendance approved',
              body: msg,
              data: { type: NotificationType.APPROVAL_APPROVED },
            });
            return;
          }

          const declineBody =
            row.review_notes?.trim() ||
            'Your shift start approval was declined. Move into your zone or contact admin.';
          Alert.alert('Approval declined', declineBody);
          dispatch(
            enqueueToast({
              id: `toast-${Date.now()}`,
              type: 'error',
              message: 'Shift start approval declined.',
            }),
          );
          void notificationService.sendLocalNotification({
            title: 'Shift start approval declined',
            body: declineBody,
            data: { type: NotificationType.APPROVAL_REJECTED },
          });
        },
      )
      .subscribe();

    return () => {
      if (channel) void client.removeChannel(channel);
    };
  }, [dispatch, enabled, isAuthenticated, role]);
}

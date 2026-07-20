import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import type { Shift } from '@prime/types';

import { useCheckIn, useCheckOut, useTodayAttendance } from '@/hooks/attendance/useAttendance';
import type { AttendanceRecord } from '@/types/attendance';
import { useAppDispatch } from '@/store/hooks';
import { setCurrentShift } from '@/store/slices/officeSlice';
import { formatElapsed } from '@/utils/formatElapsed';
import { confirmFinishShift, confirmStartShift } from '@/utils/confirmShiftAction';

function attendanceToShift(record: AttendanceRecord | null | undefined): Shift | null {
  if (!record?.checkInTime) return null;
  const isActive = !record.checkOutTime;
  return {
    id: record.id,
    officerId: record.officerId,
    shiftDate: record.date,
    status: isActive ? 'active' : 'completed',
    checkInTime: record.checkInTime,
    checkOutTime: record.checkOutTime ?? null,
  };
}

export function useActiveShift() {
  const dispatch = useAppDispatch();
  const { data: today, isLoading, refetch } = useTodayAttendance();
  const [checkIn, { isLoading: clockingIn }] = useCheckIn();
  const [checkOut, { isLoading: clockingOut }] = useCheckOut();
  const [elapsed, setElapsed] = useState(0);

  const shift = useMemo(() => attendanceToShift(today), [today]);
  const isActive = Boolean(today?.checkInTime && !today?.checkOutTime);
  const hasCompletedShiftToday = Boolean(today?.checkInTime && today?.checkOutTime);

  useEffect(() => {
    dispatch(setCurrentShift(shift));
  }, [dispatch, shift]);

  useEffect(() => {
    if (!today?.checkInTime || today.checkOutTime) {
      setElapsed(0);
      return;
    }
    const start = new Date(today.checkInTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [today?.checkInTime, today?.checkOutTime, today?.id]);

  const handleClockIn = useCallback(async () => {
    if (hasCompletedShiftToday) {
      Alert.alert(
        'Attendance complete',
        'Maximum one attendance is allowed per day. If there is an issue, contact your admin or officers.',
        [{ text: 'OK' }],
      );
      return;
    }

    const confirmed = await confirmStartShift();
    if (!confirmed) return;

    const result = await checkIn();
    if (result.action === 'shift_already_completed') {
      Alert.alert(
        'Attendance complete',
        'Maximum one attendance is allowed per day. If there is an issue, contact your admin or officers.',
      );
      return;
    }
    if (result.action === 'needs_approval') {
      Alert.alert(
        'Outside assigned zone',
        'Open the Attendance screen to request approval or move closer to your zone.',
      );
      return;
    }
    if (result.action === 'offline_queued') {
      Alert.alert('Queued offline', 'Check-in will sync when you are back online.');
      return;
    }
    if (result.action === 'already_checked_in') {
      await refetch();
      return;
    }
    if (result.action === 'checked_in') {
      await refetch();
    }
  }, [checkIn, hasCompletedShiftToday, refetch]);

  const handleClockOut = useCallback(async () => {
    const confirmed = await confirmFinishShift();
    if (!confirmed) return;

    const result = await checkOut();
    if (result.action === 'needs_approval') {
      Alert.alert(
        'Outside assigned zone',
        'Open the Attendance screen to request check-out approval or move closer.',
      );
      return;
    }
    if (result.action === 'offline_queued') {
      Alert.alert('Queued offline', 'Check-out will sync when you are back online.');
      return;
    }
    if (result.action === 'not_checked_in') {
      Alert.alert('Not checked in', 'Check in before checking out.');
      return;
    }
    if (result.action === 'checked_out') {
      dispatch(setCurrentShift(null));
      await refetch();
    }
  }, [checkOut, dispatch, refetch]);

  return {
    shift,
    isActive,
    hasCompletedShiftToday,
    completedCheckOutTime: today?.checkOutTime ?? null,
    isLoading,
    elapsed,
    elapsedLabel: formatElapsed(elapsed),
    handleClockIn,
    handleClockOut,
    clockingIn,
    clockingOut,
    refetch,
  };
}

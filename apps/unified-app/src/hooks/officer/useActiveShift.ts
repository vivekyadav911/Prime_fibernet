import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { Shift } from '@prime/types';

import {
  useClockInMutation,
  useClockOutMutation,
  useGetActiveShiftQuery,
} from '@/services/api/officersApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCurrentShift } from '@/store/slices/officeSlice';
import { formatElapsed } from '@/utils/formatElapsed';

export function useActiveShift() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const userId = user?.id ?? '';

  const { data: shift, isLoading, refetch } = useGetActiveShiftQuery(userId, {
    skip: !userId,
    pollingInterval: 60_000,
  });

  const [clockInMut, { isLoading: clockingIn }] = useClockInMutation();
  const [clockOutMut, { isLoading: clockingOut }] = useClockOutMutation();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    dispatch(setCurrentShift(shift ?? null));
  }, [dispatch, shift]);

  useEffect(() => {
    if (!shift?.checkInTime) {
      setElapsed(0);
      return;
    }
    const start = new Date(shift.checkInTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [shift?.checkInTime, shift?.id]);

  const handleClockIn = useCallback(async () => {
    if (!user) return;
    const { status } = await Location.requestForegroundPermissionsAsync();
    const coords =
      status === 'granted'
        ? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
        : { coords: { latitude: 0, longitude: 0 } };
    await clockInMut({
      userId: user.id,
      latitude: coords.coords.latitude,
      longitude: coords.coords.longitude,
    }).unwrap();
    await refetch();
  }, [clockInMut, refetch, user]);

  const handleClockOut = useCallback(async () => {
    if (!user) return;
    await clockOutMut({ userId: user.id, shiftId: shift?.id }).unwrap();
    dispatch(setCurrentShift(null));
    await refetch();
  }, [clockOutMut, dispatch, refetch, shift?.id, user]);

  const isActive = shift?.status === 'active';

  return {
    shift: shift as Shift | null | undefined,
    isActive,
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

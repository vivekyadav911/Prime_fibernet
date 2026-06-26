import { useCallback, useEffect } from 'react';

import { attendanceService } from '@/services/AttendanceService';
import { locationService } from '@/services/LocationService';
import {
  useApplyLeaveMutation,
  useCancelLeaveMutation,
  useCheckInMutation,
  useCheckOutMutation,
  useGetAttendanceHistoryQuery,
  useGetLeaveBalancesQuery,
  useGetMyApprovalRequestsQuery,
  useGetMyGeofencesQuery,
  useGetMyLeaveRequestsQuery,
  useGetTodayAttendanceQuery,
  useRequestApprovalMutation,
} from '@/services/api/attendanceApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateGeofenceStatus } from '@/store/slices/attendanceSlice';
import type { ApprovalType, Coordinates } from '@/types/attendance';

export function useTodayAttendance() {
  return useGetTodayAttendanceQuery(undefined, {
    pollingInterval: 30_000,
  });
}

export function useAttendanceHistory(filters: { month: number; year: number; page?: number }) {
  return useGetAttendanceHistoryQuery(
    { month: filters.month, year: filters.year },
    { skip: !filters.month || !filters.year },
  );
}

export function useCheckIn() {
  const [, state] = useCheckInMutation();
  const checkIn = useCallback(
    async (options?: { notes?: string; photoProof?: string; uiSaysInside?: boolean }) =>
      attendanceService.checkIn(options),
    [],
  );
  return [checkIn, state] as const;
}

export function useCheckOut() {
  const [, state] = useCheckOutMutation();
  const checkOut = useCallback(
    async (options?: { notes?: string; photoProof?: string; uiSaysInside?: boolean }) =>
      attendanceService.checkOut(options),
    [],
  );
  return [checkOut, state] as const;
}

export function useRequestApproval() {
  const [, state] = useRequestApprovalMutation();
  const requestApproval = useCallback(
    async (payload: {
      type: ApprovalType;
      reason: string;
      coords: Coordinates;
      photoProof?: string;
      date: string;
    }) => attendanceService.requestOutOfZoneApproval(payload),
    [],
  );
  return [requestApproval, state] as const;
}

export function useMyLeaveRequests(filters?: { status?: string }) {
  const query = useGetMyLeaveRequestsQuery();
  const filtered = filters?.status
    ? (query.data ?? []).filter((r) => r.status === filters.status)
    : query.data;
  return { ...query, data: filtered };
}

export function useApplyLeave() {
  return useApplyLeaveMutation();
}

export function useLeaveBalances() {
  return useGetLeaveBalancesQuery();
}

export function useMyApprovalRequests() {
  return useGetMyApprovalRequestsQuery();
}

export function useLiveGeofenceStatus() {
  const dispatch = useAppDispatch();
  const geofenceState = useAppSelector((s) => s.attendance);
  const geofencesQuery = useGetMyGeofencesQuery(undefined, {
    pollingInterval: 60_000,
  });

  const refresh = useCallback(async () => {
    try {
      const coords = await locationService.getCurrentLocation();
      const status = await locationService.checkGeofenceStatus(coords);
      dispatch(updateGeofenceStatus(status));
    } catch {
      // location unavailable
    }
  }, [dispatch]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    ...geofenceState,
    geofences: geofencesQuery.data ?? [],
    isLoading: geofencesQuery.isLoading,
    refresh,
  };
}

export function useCancelLeave() {
  return useCancelLeaveMutation();
}

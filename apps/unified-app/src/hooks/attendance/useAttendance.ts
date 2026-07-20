import { useCallback, useEffect, useMemo } from 'react';

import { attendanceService } from '@/services/AttendanceService';
import { locationService } from '@/services/LocationService';
import {
  useApplyLeaveMutation,
  useCancelLeaveMutation,
  useCheckInMutation,
  useCheckOutMutation,
  useGetAttendanceHistoryQuery,
  useGetAttendanceStatusByDayQuery,
  useGetLeaveBalancesQuery,
  useGetMyApprovalRequestsQuery,
  useGetMyGeofencesQuery,
  useGetMyLeaveRequestsQuery,
  useGetTodayAttendanceQuery,
  useRequestApprovalMutation,
} from '@/services/api/attendanceApi';
import { useOfficerId } from '@/hooks/useOfficerId';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateGeofenceStatus } from '@/store/slices/attendanceSlice';
import type { ApprovalType, AttendanceRecord, Coordinates } from '@/types/attendance';
import { getMonthIsoRange } from '@/utils/attendanceCalendarGrid';
import {
  countAttendanceStatuses,
  mapRecordsToProvisionalStatusRows,
  type AttendanceStatusDayRow,
} from '@/utils/attendanceStatus';

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

/** Canonical day status + shift records for officer month views (calendar + list). */
export function useOfficerMonthAttendance(month: number, year: number) {
  const officerId = useOfficerId();
  const { from, to } = useMemo(() => getMonthIsoRange(year, month), [month, year]);

  const statusQuery = useGetAttendanceStatusByDayQuery(
    { from, to, officerId: officerId ?? undefined },
    { skip: !officerId },
  );
  const recordsQuery = useGetAttendanceHistoryQuery({ month, year }, { skip: !officerId });

  const statusRows = statusQuery.data ?? [];
  const records = recordsQuery.data ?? [];

  const mergedStatusRows = useMemo(() => {
    const byDate = new Map<string, AttendanceStatusDayRow>();
    for (const row of statusRows) {
      byDate.set(row.shiftDate, row);
    }
    for (const record of records) {
      if (!byDate.has(record.date)) {
        const [provisional] = mapRecordsToProvisionalStatusRows([record]);
        if (provisional) byDate.set(record.date, provisional);
      }
    }
    return [...byDate.values()].sort((a, b) => a.shiftDate.localeCompare(b.shiftDate));
  }, [records, statusRows]);

  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    records.forEach((record) => map.set(record.date, record));
    return map;
  }, [records]);

  const counts = useMemo(() => countAttendanceStatuses(mergedStatusRows), [mergedStatusRows]);

  const recentStatusRows = useMemo(
    () =>
      [...mergedStatusRows]
        .filter(
          (row) =>
            row.status !== 'not_yet_recorded' ||
            row.checkInTime ||
            !row.isScheduledWorkingDay,
        )
        .sort((a, b) => b.shiftDate.localeCompare(a.shiftDate)),
    [mergedStatusRows],
  );

  return {
    officerId,
    statusRows: mergedStatusRows,
    records,
    recordsByDate,
    counts,
    recentStatusRows,
    isLoading: statusQuery.isLoading || recordsQuery.isLoading,
    isError: statusQuery.isError || recordsQuery.isError,
    error: statusQuery.error ?? recordsQuery.error,
    refetch: () => {
      void statusQuery.refetch();
      void recordsQuery.refetch();
    },
  };
}

export function useCheckIn() {
  const [, state] = useCheckInMutation();
  const checkIn = useCallback(
    async (options?: {
      notes?: string;
      photoProof?: string;
      uiSaysInside?: boolean;
      selectedGeofenceId?: string;
    }) => attendanceService.checkIn(options),
    [],
  );
  return [checkIn, state] as const;
}

export function useCheckOut() {
  const [, state] = useCheckOutMutation();
  const checkOut = useCallback(
    async (options?: {
      notes?: string;
      photoProof?: string;
      uiSaysInside?: boolean;
      selectedGeofenceId?: string;
    }) => attendanceService.checkOut(options),
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
      date?: string;
      geofenceId?: string;
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

import { useMemo } from 'react';

import {
  useGetAllAttendanceTodayQuery,
  useGetApprovalRequestsQuery,
  useGetGeofencesQuery,
  useGetLiveOfficerLocationsQuery,
} from '@/services/api/attendanceApi';
import type { AttendanceRecord, Geofence, OfficerLiveLocation } from '@/types/attendance';
import { getLocalDateString } from '@/utils/dateUtils';

export type AttendanceStats = {
  records: AttendanceRecord[];
  locations: OfficerLiveLocation[];
  geofences: Geofence[];
  pendingApprovals: number;
  present: number;
  absent: number;
  late: number;
  checkedIn: number;
  inGeofence: number;
  activeGeofences: number;
  exceptions: number;
};

export function useAttendanceStats(options?: { date?: string; enableLiveLocations?: boolean }) {
  const date = options?.date ?? getLocalDateString();
  const enableLiveLocations = options?.enableLiveLocations ?? true;

  const attendanceQuery = useGetAllAttendanceTodayQuery(undefined, {
    pollingInterval: 30_000,
  });
  const geofencesQuery = useGetGeofencesQuery(undefined, { pollingInterval: 120_000 });
  const locationsQuery = useGetLiveOfficerLocationsQuery(undefined, {
    skip: !enableLiveLocations,
    pollingInterval: 30_000,
  });
  const approvalsQuery = useGetApprovalRequestsQuery({ status: 'pending' }, { pollingInterval: 30_000 });

  const stats = useMemo((): AttendanceStats => {
    const records = attendanceQuery.data ?? [];
    const locations = locationsQuery.data ?? [];
    const geofences = geofencesQuery.data ?? [];
    const activeGeofences = geofences.filter((g) => g.isActive);

    return {
      records,
      locations,
      geofences,
      pendingApprovals: (approvalsQuery.data ?? []).length,
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => !r.checkInTime).length,
      late: records.filter((r) => r.isLate).length,
      checkedIn: records.filter((r) => r.checkInTime).length,
      inGeofence: locations.filter((l) => l.isInsideGeofence).length,
      activeGeofences: activeGeofences.length,
      exceptions: records.filter((r) => r.approvalRequestId || r.isLate).length,
    };
  }, [approvalsQuery.data, attendanceQuery.data, geofencesQuery.data, locationsQuery.data]);

  const isLoading =
    attendanceQuery.isLoading || geofencesQuery.isLoading || approvalsQuery.isLoading;
  const isError = attendanceQuery.isError || geofencesQuery.isError || approvalsQuery.isError;
  const error = attendanceQuery.error ?? geofencesQuery.error ?? approvalsQuery.error;

  const refetch = () => {
    void attendanceQuery.refetch();
    void geofencesQuery.refetch();
    void approvalsQuery.refetch();
    if (enableLiveLocations) void locationsQuery.refetch();
  };

  return {
    date,
    stats,
    isLoading,
    isError,
    error,
    refetch,
    isFetching:
      attendanceQuery.isFetching ||
      geofencesQuery.isFetching ||
      approvalsQuery.isFetching ||
      locationsQuery.isFetching,
  };
}

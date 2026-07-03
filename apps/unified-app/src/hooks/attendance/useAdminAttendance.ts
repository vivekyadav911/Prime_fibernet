import { useCallback } from 'react';

import {
  useAssignGeofenceOfficersMutation,
  useAttendanceOverrideMutation,
  useCreateGeofenceMutation,
  useCreateShiftDefinitionMutation,
  useDeleteGeofenceMutation,
  useDeleteShiftDefinitionMutation,
  useGetAdminAttendanceQuery,
  useGetAttendanceStatusByDayQuery,
  useGetAdminLeaveRequestsQuery,
  useGetAllAttendanceTodayQuery,
  useGetApprovalRequestsQuery,
  useGetAttendanceReportsQuery,
  useGetAttendanceSummaryQuery,
  useGetGeofenceQuery,
  useGetGeofencesQuery,
  useGetLiveOfficerLocationsQuery,
  useGetOfficerAttendanceRecordsQuery,
  useGetShiftDefinitionsQuery,
  useBulkReviewApprovalsMutation,
  useGetApprovalAuditLogQuery,
  useReviewApprovalMutation,
  useReviewLeaveMutation,
  useToggleGeofenceMutation,
  useUpdateGeofenceMutation,
  useUpdateShiftDefinitionMutation,
  attendanceApi,
} from '@/services/api/attendanceApi';
import { useAppDispatch } from '@/store/hooks';

export function useOfficerAttendance(
  officerId: string,
  filters: { from?: string; to?: string },
) {
  return useGetOfficerAttendanceRecordsQuery({ officerId, ...filters });
}

export function useAllAttendanceToday() {
  return useGetAllAttendanceTodayQuery(undefined, { pollingInterval: 15_000 });
}

export function useApprovalRequests(filters?: { status?: string; page?: number }) {
  return useGetApprovalRequestsQuery(filters ?? {}, {
    pollingInterval: 15_000,
  });
}

export function useReviewApproval() {
  const dispatch = useAppDispatch();
  const [mutate, state] = useReviewApprovalMutation();

  const review = useCallback(
    async (args: { id: string; action: 'approve' | 'reject'; notes?: string; reason?: string }) => {
      const patchResult = dispatch(
        attendanceApi.util.updateQueryData('getApprovalRequests', {}, (draft) => {
          const item = draft.find((r) => r.id === args.id);
          if (item) item.status = args.action === 'approve' ? 'approved' : 'rejected';
        }),
      );
      try {
        return await mutate(args).unwrap();
      } catch (e) {
        patchResult.undo();
        throw e;
      }
    },
    [dispatch, mutate],
  );

  return [review, state] as const;
}

export function useGeofences() {
  return useGetGeofencesQuery(undefined, { pollingInterval: 600_000 });
}

export function useGeofence(id: string) {
  return useGetGeofenceQuery(id, { skip: !id });
}

export function useCreateGeofence() {
  return useCreateGeofenceMutation();
}

export function useUpdateGeofence() {
  return useUpdateGeofenceMutation();
}

export function useDeleteGeofence() {
  return useDeleteGeofenceMutation();
}

export function useAssignGeofence() {
  return useAssignGeofenceOfficersMutation();
}

export function useToggleGeofence() {
  return useToggleGeofenceMutation();
}

export function useLiveOfficerLocations() {
  return useGetLiveOfficerLocationsQuery(undefined, { pollingInterval: 15_000 });
}

export function useAttendanceReports(filters: {
  from?: string;
  to?: string;
  geofenceId?: string;
  officerId?: string;
}) {
  return useGetAttendanceReportsQuery(filters, { pollingInterval: 300_000 });
}

export function useShifts() {
  return useGetShiftDefinitionsQuery();
}

export function useCreateShift() {
  return useCreateShiftDefinitionMutation();
}

export function useUpdateShift() {
  return useUpdateShiftDefinitionMutation();
}

export function useDeleteShift() {
  return useDeleteShiftDefinitionMutation();
}

export function useLeaveRequests(filters?: { status?: string; officerId?: string }) {
  return useGetAdminLeaveRequestsQuery(filters ?? {});
}

export function useReviewLeave() {
  return useReviewLeaveMutation();
}

export function useAdminAttendance(filters: {
  date?: string;
  from?: string;
  to?: string;
  officerId?: string;
  status?: string;
}) {
  return useGetAdminAttendanceQuery(filters);
}

export function useAttendanceStatusByDay(filters: {
  from: string;
  to: string;
  officerId?: string;
}) {
  return useGetAttendanceStatusByDayQuery(filters);
}

export function useAttendanceSummary(officerId: string, month: number, year: number) {
  return useGetAttendanceSummaryQuery({ officerId, month, year });
}

export function useAttendanceOverride() {
  return useAttendanceOverrideMutation();
}

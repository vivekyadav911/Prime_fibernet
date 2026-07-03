import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { adminRequestsBoardApi, useGetAdminRequestBoardQuery } from '@/services/api/adminRequestsBoardApi';
import {
  addNote as addNoteService,
  assignOfficer as assignOfficerService,
  reassignOfficer as reassignOfficerService,
} from '@/services/requestsService';
import { getSupabase } from '@/services/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useGetAllRequestsQuery } from '@/store/api/endpoints';
import type { Officer, RequestFilters, ServiceRequest } from '@/types/requests';
import { applyRequestFilters } from '@/utils/requestViewMappers';
import { queryErrorMessage } from '@/utils/queryError';

const DEFAULT_FILTERS: RequestFilters = {
  status: 'All',
  source: 'All',
  assignment: 'all',
  sortBy: 'newest',
  searchQuery: '',
};

let adminRequestsChannel: RealtimeChannel | null = null;
let adminRequestsSubscriberCount = 0;

function ensureAdminRequestsChannel(
  dispatch: ReturnType<typeof useAppDispatch>,
): RealtimeChannel {
  if (adminRequestsChannel) return adminRequestsChannel;

  const client = getSupabase();
  adminRequestsChannel = client
    .channel('admin-service-requests')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'service_requests' },
      () => {
        dispatch(adminRequestsBoardApi.util.invalidateTags(['Requests']));
      },
    )
    .subscribe();

  return adminRequestsChannel;
}

function releaseAdminRequestsChannel(): void {
  if (adminRequestsSubscriberCount > 0 || !adminRequestsChannel) return;
  void getSupabase().removeChannel(adminRequestsChannel);
  adminRequestsChannel = null;
}

export function selectUnassignedRequestCount(requests: ServiceRequest[]): number {
  return requests.filter((r) => !r.assignedOfficerId).length;
}

export function useAdminRequests() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const adminName = useAppSelector((s) => s.auth.user?.name ?? 'Admin');
  const [filters, setFilters] = useState<RequestFilters>(DEFAULT_FILTERS);
  const [optimisticRequests, setOptimisticRequests] = useState<ServiceRequest[] | null>(null);

  const {
    data: fetchedRequests,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetAdminRequestBoardQuery(undefined, { skip: !isAuthenticated });

  useEffect(() => {
    if (!isAuthenticated) return;

    adminRequestsSubscriberCount += 1;
    ensureAdminRequestsChannel(dispatch);

    return () => {
      adminRequestsSubscriberCount = Math.max(0, adminRequestsSubscriberCount - 1);
      releaseAdminRequestsChannel();
    };
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (fetchedRequests) {
      setOptimisticRequests(null);
    }
  }, [fetchedRequests]);

  const allRequests = optimisticRequests ?? fetchedRequests ?? [];

  const filteredRequests = useMemo(
    () => applyRequestFilters(allRequests, filters),
    [allRequests, filters],
  );

  const unassignedRequests = useMemo(
    () => filteredRequests.filter((r) => !r.assignedOfficerId),
    [filteredRequests],
  );

  const assignedRequests = useMemo(
    () => filteredRequests.filter((r) => !!r.assignedOfficerId),
    [filteredRequests],
  );

  const updateFilters = useCallback((patch: Partial<RequestFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const assignOfficer = useCallback(
    async (requestId: string, officer: Officer, isReassign = false) => {
      const previous = allRequests;
      const now = new Date().toISOString();

      setOptimisticRequests(
        previous.map((r) =>
          r.id === requestId
            ? {
                ...r,
                assignedOfficerId: officer.id,
                assignedOfficerName: officer.name,
                assignedOfficerRole: officer.role,
                assignedAt: now,
                status: r.status === 'Pending' ? 'In Progress' : r.status,
              }
            : r,
        ),
      );

      try {
        if (isReassign) {
          await reassignOfficerService(requestId, officer, adminName);
          Alert.alert('Success', 'Officer reassigned successfully');
        } else {
          await assignOfficerService(requestId, officer, adminName);
          Alert.alert('Success', 'Officer assigned successfully');
        }
        await refetch();
      } catch (e) {
        setOptimisticRequests(null);
        Alert.alert('Failed', e instanceof Error ? e.message : 'Could not assign officer');
        throw e;
      }
    },
    [adminName, allRequests, refetch],
  );

  const addNote = useCallback(
    async (requestId: string, note: string) => {
      const trimmed = note.trim();
      if (!trimmed) return;

      const previous = allRequests;
      const event = {
        id: `temp-${Date.now()}`,
        type: 'note_added' as const,
        description: trimmed,
        performedBy: adminName,
        timestamp: new Date().toISOString(),
      };

      setOptimisticRequests(
        previous.map((r) =>
          r.id === requestId
            ? {
                ...r,
                activityTimeline: [...r.activityTimeline, event],
                notes: [...r.notes, trimmed],
              }
            : r,
        ),
      );

      try {
        await addNoteService(requestId, trimmed, adminName);
        await refetch();
      } catch (e) {
        setOptimisticRequests(null);
        Alert.alert('Failed', e instanceof Error ? e.message : 'Could not add note');
        throw e;
      }
    },
    [adminName, allRequests, refetch],
  );

  const errorMessage = !isAuthenticated
    ? null
    : isError
      ? queryErrorMessage(error)
      : null;

  return {
    allRequests,
    filteredRequests,
    unassignedRequests,
    assignedRequests,
    filters,
    updateFilters,
    loading: isAuthenticated && isLoading && !allRequests.length,
    error: errorMessage,
    refresh,
    assignOfficer,
    addNote,
  };
}

export function useUnassignedRequestCount(): number {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { data } = useGetAllRequestsQuery(undefined, { skip: !isAuthenticated });

  return useMemo(() => (data ?? []).filter((r) => !r.officerId).length, [data]);
}

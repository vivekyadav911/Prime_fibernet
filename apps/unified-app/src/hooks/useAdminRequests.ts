import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import {
  addNote as addNoteService,
  assignOfficer as assignOfficerService,
  fetchRequests,
  reassignOfficer as reassignOfficerService,
} from '@/services/requestsService';
import { getSupabase } from '@/services/supabase';
import { useAppSelector } from '@/store/hooks';
import type { Officer, RequestFilters, ServiceRequest } from '@/types/requests';
import { applyRequestFilters } from '@/utils/requestViewMappers';

const DEFAULT_FILTERS: RequestFilters = {
  status: 'All',
  source: 'All',
  assignment: 'all',
  sortBy: 'newest',
  searchQuery: '',
};

export function selectUnassignedRequestCount(requests: ServiceRequest[]): number {
  return requests.filter((r) => !r.assignedOfficerId).length;
}

export function useAdminRequests() {
  const adminName = useAppSelector((s) => s.auth.user?.name ?? 'Admin');
  const [allRequests, setAllRequests] = useState<ServiceRequest[]>([]);
  const [filters, setFilters] = useState<RequestFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchRequests();
      setAllRequests(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const client = getSupabase();
    const channel = client
      .channel('admin-service-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_requests' },
        () => {
          void loadRequests();
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [loadRequests]);

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
    setLoading(true);
    await loadRequests();
  }, [loadRequests]);

  const assignOfficer = useCallback(
    async (requestId: string, officer: Officer, isReassign = false) => {
      const previous = allRequests;
      const now = new Date();

      setAllRequests((current) =>
        current.map((r) =>
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
        await loadRequests();
      } catch (e) {
        setAllRequests(previous);
        Alert.alert('Failed', e instanceof Error ? e.message : 'Could not assign officer');
        throw e;
      }
    },
    [adminName, allRequests, loadRequests],
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
        timestamp: new Date(),
      };

      setAllRequests((current) =>
        current.map((r) =>
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
        await loadRequests();
      } catch (e) {
        setAllRequests(previous);
        Alert.alert('Failed', e instanceof Error ? e.message : 'Could not add note');
        throw e;
      }
    },
    [adminName, allRequests, loadRequests],
  );

  return {
    allRequests,
    filteredRequests,
    unassignedRequests,
    assignedRequests,
    filters,
    updateFilters,
    loading,
    error,
    refresh,
    assignOfficer,
    addNote,
  };
}

export function useUnassignedRequestCount(): number {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await fetchRequests();
      setCount(selectUnassignedRequestCount(data));
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    void load();
    const client = getSupabase();
    const channel = client
      .channel('admin-requests-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_requests' },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [load]);

  return count;
}

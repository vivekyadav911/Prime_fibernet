import { useEffect, useMemo, useRef, useState } from 'react';

import { getSupabase } from '@/services/api/supabase';
import { useGetTrackingOfficerLocationsQuery } from '@/services/api/officerTrackingApi';
import type { OfficerLocation } from '@/types/map';

const POLL_INTERVAL_MS = 30_000;

export function useOfficerLocations() {
  const { data: initialData, isLoading, isError, error, refetch } =
    useGetTrackingOfficerLocationsQuery(undefined, { pollingInterval: POLL_INTERVAL_MS });

  const [locations, setLocations] = useState<OfficerLocation[]>([]);
  const [livePaused, setLivePaused] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>['channel']> | null>(null);

  useEffect(() => {
    if (initialData) {
      setLocations(initialData);
      return;
    }
    if (!isLoading && !isError) {
      setLocations([]);
    }
  }, [initialData, isLoading, isError]);

  useEffect(() => {
    const client = getSupabase();
    let cancelled = false;

    const channel = client
      .channel('officer-locations-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'officer_locations' },
        (payload) => {
          const updated = payload.new as OfficerLocation;
          if (!updated?.officer_id) return;
          setLivePaused(false);
          setLocations((prev) => {
            const idx = prev.findIndex((l) => l.officer_id === updated.officer_id);
            if (idx === -1) return [...prev, updated];
            const next = [...prev];
            next[idx] = { ...next[idx], ...updated };
            return next;
          });
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setLivePaused(true);
        }
      });

    channelRef.current = channel;

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
      channelRef.current = null;
    };
  }, []);

  const officerIds = useMemo(() => locations.map((l) => l.officer_id), [locations]);

  return {
    locations,
    officerIds,
    isLoading,
    isError,
    error,
    refetch,
    livePaused,
  };
}

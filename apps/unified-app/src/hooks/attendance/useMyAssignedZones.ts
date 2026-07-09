import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useGetMyGeofencesQuery } from '@/services/api/attendanceApi';
import { locationService } from '@/services/LocationService';
import { useAppDispatch } from '@/store/hooks';
import { setAssignedGeofences, updateGeofenceStatus } from '@/store/slices/attendanceSlice';
import type { Coordinates, Geofence } from '@/types/attendance';
import { checkGeofenceStatus, getNearestGeofence } from '@/utils/geofenceUtils';

export type AssignedZoneState =
  | { status: 'loading' }
  | { status: 'none'; zones: [] }
  | { status: 'single'; zones: [Geofence]; selectedZone: Geofence }
  | { status: 'multiple'; zones: Geofence[]; selectedZone: Geofence };

export function useMyAssignedZones() {
  const dispatch = useAppDispatch();
  const query = useGetMyGeofencesQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const zones = query.data ?? [];
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const lastRefreshAtRef = useRef(0);

  const refreshLocation = useCallback(async () => {
    setIsLocationLoading(true);
    try {
      const next = await locationService.getCurrentLocation();
      setCoords(next);
      return next;
    } catch {
      setCoords(null);
      return null;
    } finally {
      setIsLocationLoading(false);
    }
  }, []);

  const refreshZones = useCallback(async () => {
    await locationService.clearGeofenceCache();
    await query.refetch();
  }, [query]);

  useEffect(() => {
    void refreshLocation();
  }, [refreshLocation]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') return;
      const now = Date.now();
      if (now - lastRefreshAtRef.current < 30_000) return;
      lastRefreshAtRef.current = now;
      void refreshZones();
      void refreshLocation();
    });
    return () => sub.remove();
  }, [refreshLocation, refreshZones]);

  useEffect(() => {
    dispatch(setAssignedGeofences(zones));
  }, [dispatch, zones]);

  const selectedZone = useMemo(() => {
    if (zones.length === 0) return null;
    if (selectedZoneId) {
      return zones.find((z) => z.id === selectedZoneId) ?? zones[0]!;
    }
    if (coords && zones.length > 1) {
      const nearest = getNearestGeofence(coords, zones);
      return nearest?.geofence ?? zones[0]!;
    }
    return zones[0]!;
  }, [coords, selectedZoneId, zones]);

  const geofenceStatus = useMemo(() => {
    if (zones.length === 0 || !coords) {
      return { isInside: false, geofence: null as Geofence | null, distance: null as number | null };
    }
    const activeZones = selectedZone ? [selectedZone] : zones;
    const status = checkGeofenceStatus(coords, activeZones, { accuracyMeters: coords.accuracy });
    return {
      isInside: status.isInside,
      geofence: status.geofence,
      distance: Number.isFinite(status.distance) ? status.distance : null,
    };
  }, [coords, selectedZone, zones]);

  useEffect(() => {
    dispatch(
      updateGeofenceStatus({
        isInside: geofenceStatus.isInside,
        geofence: geofenceStatus.geofence,
        distance: geofenceStatus.distance ?? Number.POSITIVE_INFINITY,
      }),
    );
  }, [dispatch, geofenceStatus]);

  const state: AssignedZoneState = query.isLoading
    ? { status: 'loading' }
    : zones.length === 0
      ? { status: 'none', zones: [] }
      : zones.length === 1
        ? { status: 'single', zones: [zones[0]!], selectedZone: zones[0]! }
        : {
            status: 'multiple',
            zones,
            selectedZone: selectedZone ?? zones[0]!,
          };

  return {
    ...state,
    zones,
    selectedZone,
    setSelectedZoneId,
    coords,
    isLocationLoading,
    geofenceStatus,
    hasZone: zones.length > 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refreshZones,
    refreshLocation,
  };
}

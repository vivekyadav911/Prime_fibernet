import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

export type LocationCoords = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
};

type UseLocationOptions = {
  /** Officer shift live tracking — requests background permission */
  enableBackground?: boolean;
  /** Mirrors Flutter LocationService 30s interval */
  timeIntervalMs?: number;
  distanceIntervalM?: number;
};

type UseLocationResult = {
  coords: LocationCoords | null;
  heading: number | null;
  accuracy: number | null;
  error: string | null;
  isLoading: boolean;
  permissionGranted: boolean | null;
  checkPermission: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  startTracking: () => Promise<LocationCoords | null>;
  stopTracking: () => void;
};

export function useLocation(options: UseLocationOptions = {}): UseLocationResult {
  const { enableBackground = false, timeIntervalMs = 30_000, distanceIntervalM = 10 } = options;

  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const permissionsRequested = useRef(false);

  const applyPosition = useCallback((position: Location.LocationObject) => {
    setCoords({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude,
      accuracy: position.coords.accuracy,
    });
    setAccuracy(position.coords.accuracy);
  }, []);

  const checkPermission = useCallback(async (): Promise<boolean> => {
    const fg = await Location.getForegroundPermissionsAsync();
    const granted = fg.status === 'granted';
    setPermissionGranted(granted);
    return granted;
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const fg = await Location.requestForegroundPermissionsAsync();
    const granted = fg.status === 'granted';
    setPermissionGranted(granted);
    if (!granted) {
      setError('Location permission denied');
    }
    return granted;
  }, []);

  const ensurePermissions = useCallback(async () => {
    if (!permissionsRequested.current) {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.status !== 'granted') {
        throw new Error('Location permission denied');
      }
      permissionsRequested.current = true;
    }

    if (enableBackground) {
      const bg = await Location.requestBackgroundPermissionsAsync();
      if (bg.status !== 'granted') {
        throw new Error('Background location permission denied');
      }
    }

    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      throw new Error('Location services are disabled');
    }
  }, [enableBackground]);

  const refreshHeading = useCallback(async () => {
    try {
      const h = await Location.getHeadingAsync();
      setHeading(h.magHeading ?? h.trueHeading ?? null);
    } catch {
      setHeading(null);
    }
  }, []);

  const startTracking = useCallback(async (): Promise<LocationCoords | null> => {
    setIsLoading(true);
    setError(null);
    try {
      await ensurePermissions();

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const position: LocationCoords = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        altitude: current.coords.altitude,
        accuracy: current.coords.accuracy,
      };
      applyPosition(current);
      await refreshHeading();

      if (watcherRef.current) {
        watcherRef.current.remove();
      }

      watcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: timeIntervalMs,
          distanceInterval: distanceIntervalM,
          mayShowUserSettingsDialog: true,
        },
        (pos) => {
          applyPosition(pos);
          void refreshHeading();
        },
      );
      return position;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start location tracking');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [applyPosition, ensurePermissions, refreshHeading, timeIntervalMs, distanceIntervalM]);

  const stopTracking = useCallback(() => {
    watcherRef.current?.remove();
    watcherRef.current = null;
  }, []);

  useEffect(() => {
    void checkPermission();
  }, [checkPermission]);

  useEffect(() => () => {
    watcherRef.current?.remove();
    watcherRef.current = null;
  }, []);

  return {
    coords,
    heading,
    accuracy,
    error,
    isLoading,
    permissionGranted,
    checkPermission,
    requestPermission,
    startTracking,
    stopTracking,
  };
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { store } from '@/store/store';
import {
  setAssignedGeofences,
  setCurrentLocation,
  setTrackingActive,
  updateGeofenceStatus,
} from '@/store/slices/attendanceSlice';
import type { Coordinates, Geofence, LocationSyncEntry } from '@/types/attendance';
import { checkGeofenceStatus } from '@/utils/geofenceUtils';

import { attendanceApi } from '@/services/api/attendanceApi';
import { officerTrackingApi } from '@/services/api/officerTrackingApi';
import { getSupabase } from '@/services/api/supabase';
import { notificationService } from '@/services/NotificationService';

export const LOCATION_TASK_NAME = 'PRIME_FIBERNET_LOCATION_TASK';
const GEOFENCES_CACHE_KEY = 'geofences_cache';
const GEOFENCES_CACHE_TTL_MS = 15 * 60 * 1000;
const LOCATION_SYNC_QUEUE_KEY = 'location_sync_queue';
const MAX_QUEUE_SIZE = 500;

type CachedGeofences = { fetchedAt: number; geofences: Geofence[] };

type LocationTaskData = {
  locations: Array<{
    coords: {
      latitude: number;
      longitude: number;
      accuracy: number;
      altitude: number | null;
      speed: number | null;
      heading: number | null;
    };
    timestamp: number;
  }>;
};

const TRACKING_SETTINGS_CACHE_KEY = 'location_tracking_settings_cache';
const TRACKING_SETTINGS_TTL_MS = 5 * 60 * 1000;

async function getBatteryLevel(): Promise<number | undefined> {
  try {
    const level = await Battery.getBatteryLevelAsync();
    return Math.round(level * 100);
  } catch {
    return undefined;
  }
}

async function isLocationTrackingAllowed(): Promise<boolean> {
  const cached = await AsyncStorage.getItem(TRACKING_SETTINGS_CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached) as { fetchedAt: number; allowed: boolean };
    if (Date.now() - parsed.fetchedAt < TRACKING_SETTINGS_TTL_MS) {
      return parsed.allowed;
    }
  }

  try {
    const client = getSupabase();
    const { data: session } = await client.auth.getSession();
    const userId = session.session?.user?.id;
    if (!userId) return false;

    const { data: settings } = await client
      .from('general_settings')
      .select('location_tracking_enabled')
      .limit(1)
      .maybeSingle();

    const globalEnabled = Boolean(settings?.location_tracking_enabled ?? true);

    const { data: officer } = await client
      .from('officers')
      .select('is_location_tracking_enabled')
      .or(`user_id.eq.${userId},auth_user_id.eq.${userId}`)
      .maybeSingle();

    const officerEnabled = Boolean(officer?.is_location_tracking_enabled ?? true);
    const allowed = globalEnabled && officerEnabled;

    await AsyncStorage.setItem(
      TRACKING_SETTINGS_CACHE_KEY,
      JSON.stringify({ fetchedAt: Date.now(), allowed }),
    );
    return allowed;
  } catch {
    return true;
  }
}

let foregroundSubscription: Location.LocationSubscription | null = null;
let prevStatus: { isInside: boolean; geofenceId?: string } = { isInside: false };

async function loadLocationQueue(): Promise<LocationSyncEntry[]> {
  const raw = await AsyncStorage.getItem(LOCATION_SYNC_QUEUE_KEY);
  return raw ? (JSON.parse(raw) as LocationSyncEntry[]) : [];
}

async function saveLocationQueue(queue: LocationSyncEntry[]): Promise<void> {
  await AsyncStorage.setItem(
    LOCATION_SYNC_QUEUE_KEY,
    JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)),
  );
}

async function enqueueLocationEntry(entry: LocationSyncEntry): Promise<void> {
  const queue = await loadLocationQueue();
  queue.push(entry);
  await saveLocationQueue(queue);
}

async function flushLocationQueue(): Promise<void> {
  const queue = await loadLocationQueue();
  if (queue.length === 0) return;

  const remaining: LocationSyncEntry[] = [];
  for (const entry of queue) {
    try {
      await store
        .dispatch(
          attendanceApi.endpoints.updateOfficerLocation.initiate({
            coords: entry.coords,
            accuracy: entry.accuracy ?? 0,
            timestamp: entry.timestamp,
          }),
        )
        .unwrap();
    } catch {
      remaining.push(entry);
    }
  }
  await saveLocationQueue(remaining);
}

async function handleGeofenceTransition(
  prev: { isInside: boolean; geofenceId?: string },
  next: { isInside: boolean; geofenceId?: string },
  coords: Coordinates,
  geofenceName?: string,
): Promise<void> {
  if (prev.isInside === next.isInside && prev.geofenceId === next.geofenceId) return;

  if (!prev.isInside && next.isInside && geofenceName) {
    await notificationService.sendLocalNotification({
      title: 'Entered geofence',
      body: `You're inside ${geofenceName}. Tap to check in.`,
      data: { type: 'geofence_entered', geofenceId: next.geofenceId },
    });
    if (next.geofenceId) {
      try {
        await store.dispatch(
          officerTrackingApi.endpoints.insertGeofenceEvent.initiate({
            geofenceId: next.geofenceId,
            eventType: 'enter',
            latitude: coords.latitude,
            longitude: coords.longitude,
          }),
        ).unwrap();
      } catch {
        /* queue handles retry via location sync */
      }
    }
    await enqueueLocationEntry({
      coords,
      timestamp: new Date().toISOString(),
      geofenceStatus: { isInside: true, geofence: null, distance: 0 },
      eventType: 'geofence_enter',
    });
  }

  if (prev.isInside && !next.isInside && geofenceName) {
    await notificationService.sendLocalNotification({
      title: 'Left geofence',
      body: `You've left ${geofenceName}.`,
      data: { type: 'geofence_exited', geofenceId: prev.geofenceId },
    });
    if (prev.geofenceId) {
      try {
        await store.dispatch(
          officerTrackingApi.endpoints.insertGeofenceEvent.initiate({
            geofenceId: prev.geofenceId,
            eventType: 'exit',
            latitude: coords.latitude,
            longitude: coords.longitude,
          }),
        ).unwrap();
      } catch {
        /* best effort */
      }
    }
    await enqueueLocationEntry({
      coords,
      timestamp: new Date().toISOString(),
      geofenceStatus: { isInside: false, geofence: null, distance: 0 },
      eventType: 'geofence_exit',
    });
  }
}

export async function processBackgroundLocation(data: LocationTaskData): Promise<void> {
  const allowed = await isLocationTrackingAllowed();
  if (!allowed) return;

  const latest = data.locations[data.locations.length - 1];
  if (!latest) return;

  const coords: Coordinates = {
    latitude: latest.coords.latitude,
    longitude: latest.coords.longitude,
    accuracy: latest.coords.accuracy ?? undefined,
  };

  store.dispatch(setCurrentLocation(coords));

  const geofences = await locationService.loadAssignedGeofences();
  const status = checkGeofenceStatus(coords, geofences, {
    accuracyMeters: coords.accuracy,
  });
  store.dispatch(updateGeofenceStatus(status));

  const nextStatus = {
    isInside: status.isInside,
    geofenceId: status.geofence?.id,
  };
  await handleGeofenceTransition(
    prevStatus,
    nextStatus,
    coords,
    status.geofence?.name,
  );
  prevStatus = nextStatus;

  const batteryLevel = await getBatteryLevel();

  try {
    await store
      .dispatch(
        attendanceApi.endpoints.updateOfficerLocation.initiate({
          coords,
          accuracy: latest.coords.accuracy,
          timestamp: new Date(latest.timestamp).toISOString(),
          batteryLevel,
          heading: latest.coords.heading,
          speed: latest.coords.speed,
          altitude: latest.coords.altitude,
        }),
      )
      .unwrap();
  } catch {
    await enqueueLocationEntry({
      coords,
      timestamp: new Date(latest.timestamp).toISOString(),
      geofenceStatus: status,
      eventType: 'location_update',
      accuracy: latest.coords.accuracy,
    });
  }
}

class LocationService {
  async requestPermissions(): Promise<{ foreground: boolean; background: boolean }> {
    const fg = await Location.requestForegroundPermissionsAsync();
    const bg = await Location.requestBackgroundPermissionsAsync();
    return {
      foreground: fg.status === 'granted',
      background: bg.status === 'granted',
    };
  }

  async checkPermissions(): Promise<{ foreground: boolean; background: boolean }> {
    const fg = await Location.getForegroundPermissionsAsync();
    const bg = await Location.getBackgroundPermissionsAsync();
    return {
      foreground: fg.status === 'granted',
      background: bg.status === 'granted',
    };
  }

  async getCurrentLocation(retries = 4): Promise<Coordinates & { mocked?: boolean }> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        await Location.requestForegroundPermissionsAsync();
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) throw new Error('Location services are disabled');

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? undefined,
          mocked: position.mocked ?? undefined,
        };
        store.dispatch(setCurrentLocation(coords));
        return coords;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error('Location unavailable');
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 30_000)));
        }
      }
    }
    throw lastError ?? new Error('Location unavailable');
  }

  async startForegroundTracking(
    onLocationUpdate: (coords: Coordinates) => void,
    options?: { accuracy?: Location.LocationAccuracy; intervalMs?: number },
  ): Promise<void> {
    if (foregroundSubscription) {
      foregroundSubscription.remove();
    }

    const accuracy = options?.accuracy ?? Location.Accuracy.High;
    const intervalMs = options?.intervalMs ?? 15_000;

    foregroundSubscription = await Location.watchPositionAsync(
      { accuracy, timeInterval: intervalMs, distanceInterval: 10 },
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        store.dispatch(setCurrentLocation(coords));
        onLocationUpdate(coords);
      },
    );
    store.dispatch(setTrackingActive(true));
  }

  async stopForegroundTracking(): Promise<void> {
    foregroundSubscription?.remove();
    foregroundSubscription = null;
    store.dispatch(setTrackingActive(false));
  }

  async startBackgroundTracking(): Promise<void> {
    const allowed = await isLocationTrackingAllowed();
    if (!allowed) {
      throw new Error('Location tracking is disabled for this officer or organization');
    }

    const { background } = await this.checkPermissions();
    if (!background) {
      const requested = await this.requestPermissions();
      if (!requested.background) throw new Error('Background location permission denied');
    }

    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (started) return;

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 20,
      timeInterval: 30_000,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Prime Fibernet',
        notificationBody: 'Tracking location for attendance',
      },
    });
    store.dispatch(setTrackingActive(true));
  }

  async stopBackgroundTracking(): Promise<void> {
    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (started) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
    store.dispatch(setTrackingActive(false));
  }

  async isBackgroundTrackingActive(): Promise<boolean> {
    return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  }

  async clearGeofenceCache(): Promise<void> {
    await AsyncStorage.removeItem(GEOFENCES_CACHE_KEY);
  }

  async loadAssignedGeofences(forceRefresh = false): Promise<Geofence[]> {
    if (!forceRefresh) {
      const cached = await AsyncStorage.getItem(GEOFENCES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as CachedGeofences;
        if (Date.now() - parsed.fetchedAt < GEOFENCES_CACHE_TTL_MS) {
          store.dispatch(setAssignedGeofences(parsed.geofences));
          return parsed.geofences;
        }
      }
    }

    try {
      const result = await store.dispatch(attendanceApi.endpoints.getMyGeofences.initiate()).unwrap();
      await AsyncStorage.setItem(
        GEOFENCES_CACHE_KEY,
        JSON.stringify({ fetchedAt: Date.now(), geofences: result }),
      );
      store.dispatch(setAssignedGeofences(result));
      return result;
    } catch {
      const cached = await AsyncStorage.getItem(GEOFENCES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as CachedGeofences;
        return parsed.geofences;
      }
      return [];
    }
  }

  async checkGeofenceStatus(coords: Coordinates) {
    const geofences = await this.loadAssignedGeofences();
    const status = checkGeofenceStatus(coords, geofences, {
      accuracyMeters: coords.accuracy,
    });
    store.dispatch(updateGeofenceStatus(status));
    return status;
  }

  async flushOfflineQueue(): Promise<void> {
    await flushLocationQueue();
  }
}

export const locationService = new LocationService();

if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) return;
    if (data) {
      await processBackgroundLocation(data as LocationTaskData);
    }
  });
}

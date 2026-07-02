import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform, type AppStateStatus } from 'react-native';

import { locationService } from '@/services/LocationService';
import { useAppDispatch } from '@/store/hooks';
import {
  setBackgroundPermissionStatus,
  setLocationPermissionStatus,
} from '@/store/slices/attendanceSlice';

export type LocationPermissionMode = 'full' | 'limited' | 'blocked';

export function useLocationPermissionState() {
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<LocationPermissionMode>('blocked');
  const [checking, setChecking] = useState(true);

  const evaluate = useCallback(async () => {
    setChecking(true);
    try {
      const perms = await locationService.checkPermissions();
      dispatch(setLocationPermissionStatus(perms.foreground ? 'granted' : 'denied'));
      dispatch(setBackgroundPermissionStatus(perms.background ? 'granted' : 'denied'));

      if (!perms.foreground) {
        setMode('blocked');
      } else if (perms.background) {
        setMode('full');
      } else {
        setMode('limited');
      }
    } finally {
      setChecking(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void evaluate();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void evaluate();
    });
    return () => sub.remove();
  }, [evaluate]);

  const requestForeground = useCallback(async () => {
    const fg = await Location.requestForegroundPermissionsAsync();
    await evaluate();
    return fg.status === 'granted';
  }, [evaluate]);

  const requestBackground = useCallback(async () => {
    const bg = await Location.requestBackgroundPermissionsAsync();
    await evaluate();
    return bg.status === 'granted';
  }, [evaluate]);

  const openSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  return {
    mode,
    checking,
    refresh: evaluate,
    requestForeground,
    requestBackground,
    openSettings,
    isWeb: Platform.OS === 'web',
  };
}

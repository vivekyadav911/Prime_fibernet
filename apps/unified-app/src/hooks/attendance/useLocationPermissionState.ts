import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, type AppStateStatus } from 'react-native';

import { locationService } from '@/services/LocationService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { store } from '@/store/store';
import {
  setBackgroundPermissionStatus,
  setLocationPermissionStatus,
} from '@/store/slices/attendanceSlice';

export type LocationPermissionMode = 'full' | 'limited' | 'blocked';

export function useLocationPermissionState() {
  const dispatch = useAppDispatch();
  const fgStatus = useAppSelector((s) => s.attendance.locationPermissionStatus);
  const bgStatus = useAppSelector((s) => s.attendance.backgroundPermissionStatus);
  const initialCheckDone = useRef(false);
  const [checking, setChecking] = useState(true);

  const mode: LocationPermissionMode =
    fgStatus === 'undetermined'
      ? 'blocked'
      : fgStatus !== 'granted'
        ? 'blocked'
        : bgStatus === 'granted'
          ? 'full'
          : 'limited';

  const evaluate = useCallback(async () => {
    const showCheckingUi = !initialCheckDone.current;
    if (showCheckingUi) setChecking(true);
    try {
      const perms = await locationService.checkPermissions();
      const nextFg = perms.foreground ? 'granted' : 'denied';
      const nextBg = perms.background ? 'granted' : 'denied';
      const current = store.getState().attendance;

      if (current.locationPermissionStatus !== nextFg) {
        dispatch(setLocationPermissionStatus(nextFg));
      }
      if (current.backgroundPermissionStatus !== nextBg) {
        dispatch(setBackgroundPermissionStatus(nextBg));
      }
    } finally {
      initialCheckDone.current = true;
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

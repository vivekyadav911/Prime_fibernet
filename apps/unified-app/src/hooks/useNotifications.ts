import * as Device from 'expo-device';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { registerFcmToken, getSupabase } from '@/services/supabase';
import { store } from '@/store/store';
import { isPushNotificationsSupported } from '@/utils/pushNotifications';

import type * as NotificationsModule from 'expo-notifications';

type NotificationsApi = typeof NotificationsModule;

let notificationsPromise: Promise<NotificationsApi | null> | null = null;

async function loadNotifications(): Promise<NotificationsApi | null> {
  if (!isPushNotificationsSupported()) return null;

  if (!notificationsPromise) {
    notificationsPromise = import('expo-notifications').then((module) => {
      module.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      return module;
    });
  }

  return notificationsPromise;
}

export type PushMessage = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type UseNotificationsResult = {
  token: string | null;
  permissionGranted: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  getToken: (userId?: string) => Promise<string | null>;
  registerToken: () => Promise<string | null>;
  setupForegroundHandler: () => void;
};

/**
 * Push notifications for the unified Expo app.
 *
 * Skipped in Expo Go (SDK 53+ removed Android remote push support there).
 * Use a development build for full push notification testing.
 */
export function useNotifications(): UseNotificationsResult {
  const [token, setToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const foregroundSub = useRef<NotificationsModule.EventSubscription | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const Notifications = await loadNotifications();
    if (!Notifications) {
      setError('Push notifications require a development build');
      return false;
    }

    if (!Device.isDevice) {
      setError('Push notifications require a physical device');
      return false;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    const granted = finalStatus === 'granted';
    setPermissionGranted(granted);
    if (!granted) {
      setError('Notification permission denied');
    }
    return granted;
  }, []);

  const getToken = useCallback(async (userId?: string): Promise<string | null> => {
    setError(null);
    const Notifications = await loadNotifications();
    if (!Notifications) return null;

    const granted = await requestPermission();
    if (!granted) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
      await Notifications.setNotificationChannelAsync('urgent', {
        name: 'Urgent Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#EF4444',
      });
      await Notifications.setNotificationChannelAsync('promotional', {
        name: 'Promotions',
        importance: Notifications.AndroidImportance.LOW,
      });
      await Notifications.setNotificationChannelAsync('shifts', {
        name: 'Shift reminders',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Officer shift start/end reminders (Flutter ShiftNotificationService)',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;
    setToken(pushToken);

    if (userId) {
      try {
        const authUser = store.getState().auth.user;
        const userType = authUser?.role ?? 'customer';
        let planId: string | undefined;
        let area: string | undefined;

        const client = getSupabase();
        const { data: profile } = await client
          .from('users')
          .select('city')
          .eq('id', userId)
          .maybeSingle();
        area = profile?.city ? String(profile.city) : undefined;

        const { data: sub } = await client
          .from('subscriptions')
          .select('plan_id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();
        planId = sub?.plan_id ? String(sub.plan_id) : undefined;

        await registerFcmToken(userId, pushToken, { userType, planId, area });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to store push token');
      }
    }

    return pushToken;
  }, [requestPermission]);

  const registerToken = useCallback(async (): Promise<string | null> => {
    const userId = store.getState().auth.user?.id;
    if (!userId) return null;
    return getToken(userId);
  }, [getToken]);

  const setupForegroundHandler = useCallback(() => {
    void loadNotifications().then((Notifications) => {
      if (!Notifications) return;

      foregroundSub.current?.remove();
      foregroundSub.current = Notifications.addNotificationReceivedListener(() => {
        // Foreground display handled by setNotificationHandler in loadNotifications.
      });
    });
  }, []);

  useEffect(() => {
    if (!isPushNotificationsSupported()) return;

    void requestPermission();

    let responseSub: NotificationsModule.EventSubscription | null = null;

    void loadNotifications().then((Notifications) => {
      if (!Notifications) return;

      responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const payload = response.notification.request.content.data;
        if (__DEV__) {
          console.log('[notifications] tapped', payload);
        }
      });
    });

    return () => {
      foregroundSub.current?.remove();
      responseSub?.remove();
    };
  }, [requestPermission]);

  return {
    token,
    permissionGranted,
    error,
    requestPermission,
    getToken,
    registerToken,
    setupForegroundHandler,
  };
}

/** Call once at app startup from App entry (no-op in Expo Go). */
export async function setupBackgroundHandler(): Promise<void> {
  if (Platform.OS === 'web' || !isPushNotificationsSupported()) return;
  await loadNotifications();
}

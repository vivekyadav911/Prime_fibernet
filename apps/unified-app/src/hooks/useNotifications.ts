import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { registerFcmToken } from '@/services/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
};

/**
 * Push notifications for the unified Expo app.
 *
 * Flutter officer app uses `flutter_local_notifications` for shift reminders only.
 * There is no `@react-native-firebase/messaging` in the Flutter apps — this hook uses
 * `expo-notifications` (Expo push token stored in `user_fcm_tokens`, same table).
 */
export function useNotifications(): UseNotificationsResult {
  const [token, setToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const foregroundSub = useRef<Notifications.EventSubscription | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
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
    const granted = await requestPermission();
    if (!granted) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
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
        await registerFcmToken(userId, pushToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to store push token');
      }
    }

    return pushToken;
  }, [requestPermission]);

  useEffect(() => {
    void requestPermission();

    foregroundSub.current = Notifications.addNotificationReceivedListener(() => {
      // Foreground display handled by Notifications.setNotificationHandler above.
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const payload = response.notification.request.content.data;
      if (__DEV__) {
        console.log('[notifications] tapped', payload);
      }
    });

    return () => {
      foregroundSub.current?.remove();
      responseSub.remove();
    };
  }, [requestPermission]);

  return {
    token,
    permissionGranted,
    error,
    requestPermission,
    getToken,
  };
}

/** Register background notification task — call once from App entry (Expo task API). */
export async function registerBackgroundNotificationHandler(): Promise<void> {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

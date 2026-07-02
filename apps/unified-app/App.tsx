import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';

import { OfflineBanner } from '@/components/common/OfflineBanner';
import { AppNavigator } from '@/navigation/AppNavigator';
import { linking } from '@/navigation/linking';
import { useAuthBootstrap } from '@/hooks/useAuth';
import { setupBackgroundHandler, useNotifications } from '@/hooks/useNotifications';
import { recoverStuckSendingNotifications } from '@/services/broadcastNotificationService';
import { SyncManager } from '@/services/offline/syncManager';
import '@/services/LocationService';
import { attendanceApi } from '@/services/api/attendanceApi';
import { officersApi } from '@/services/api/officersApi';
import { paymentCollectionApi } from '@/services/api/paymentCollectionApi';
import { requestsApi } from '@/services/api/requestsApi';
import { persistor, store } from '@/store/store';
import { useAppSelector } from '@/store/hooks';
import { bootstrapWebLayout } from '@/utils/webLayoutBootstrap';

if (Platform.OS !== 'web') {
  void setupBackgroundHandler();
} else {
  bootstrapWebLayout();
}

function Root() {
  useAuthBootstrap();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { registerToken, setupForegroundHandler } = useNotifications();

  useEffect(() => {
    if (isAuthenticated) {
      void registerToken();
      setupForegroundHandler();
      void recoverStuckSendingNotifications();
      if (Platform.OS !== 'web') {
        void import('@/tasks/scheduledNotificationsTask')
          .then((mod) => mod.registerScheduledNotificationsTask())
          .catch(() => undefined);
      }
    }
  }, [isAuthenticated, registerToken, setupForegroundHandler]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    SyncManager.setExecutor(async (mutation) => {
      const op = mutation.operation ?? mutation.endpoint;
      if (op === 'updateRequestStatus') {
        const payload = mutation.payload as { id: string; status: string; note?: string };
        await store
          .dispatch(requestsApi.endpoints.updateRequestStatus.initiate(payload))
          .unwrap();
        return;
      }
      if (op === 'attendanceCheckIn') {
        const payload = mutation.payload as {
          coords: { latitude: number; longitude: number; mocked?: boolean };
          notes?: string;
          method: string;
          geofenceId?: string;
          distanceFromFence?: number;
          locationMocked?: boolean;
        };
        await store
          .dispatch(
            attendanceApi.endpoints.checkIn.initiate({
              coords: payload.coords,
              notes: payload.notes,
              method: payload.method,
              geofenceId: payload.geofenceId ?? '',
              distanceFromFence: payload.distanceFromFence ?? 0,
              locationMocked: payload.locationMocked ?? payload.coords.mocked,
            }),
          )
          .unwrap();
        return;
      }
      if (op === 'attendanceCheckOut') {
        const payload = mutation.payload as {
          coords: { latitude: number; longitude: number };
          notes?: string;
          distanceFromFence?: number;
        };
        await store
          .dispatch(
            attendanceApi.endpoints.checkOut.initiate({
              coords: payload.coords,
              notes: payload.notes,
              distanceFromFence: payload.distanceFromFence ?? 0,
            }),
          )
          .unwrap();
        return;
      }
      if (op === 'attendanceApproval') {
        const payload = mutation.payload as {
          type: import('@/types/attendance').ApprovalType;
          reason: string;
          coords: { latitude: number; longitude: number; accuracy?: number };
          photoProof?: string;
          date: string;
          distanceFromFence?: number;
          geofenceId?: string;
        };
        await store
          .dispatch(
            attendanceApi.endpoints.requestApproval.initiate({
              type: payload.type,
              reason: payload.reason,
              coords: payload.coords,
              photoProof: payload.photoProof,
              date: payload.date,
              distanceFromFence: payload.distanceFromFence ?? 0,
              geofenceId: payload.geofenceId,
            }),
          )
          .unwrap();
        return;
      }
      if (op === 'locationUpdate') {
        const payload = mutation.payload as {
          coords: { latitude: number; longitude: number };
          accuracy: number;
          timestamp: string;
        };
        await store
          .dispatch(attendanceApi.endpoints.updateOfficerLocation.initiate(payload))
          .unwrap();
        return;
      }
      if (op === 'recordCashCollection') {
        await store
          .dispatch(
            paymentCollectionApi.endpoints.recordCashCollection.initiate(
              mutation.payload as never,
            ),
          )
          .unwrap();
        return;
      }
      if (op === 'clockIn') {
        const payload = mutation.payload as { userId: string; latitude: number; longitude: number };
        await store.dispatch(officersApi.endpoints.clockIn.initiate(payload)).unwrap();
        return;
      }
      if (op === 'clockOut') {
        const payload = mutation.payload as { userId: string; shiftId?: string };
        await store.dispatch(officersApi.endpoints.clockOut.initiate(payload)).unwrap();
        return;
      }
      throw new Error(`Unsupported offline mutation: ${op}`);
    });

    void SyncManager.loadQueue();
    return SyncManager.subscribe(() => undefined);
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <PaperProvider>
              <BottomSheetModalProvider>
                <View style={styles.root}>
                  <OfflineBanner />
                  <NavigationContainer linking={linking}>
                    <Root />
                  </NavigationContainer>
                </View>
              </BottomSheetModalProvider>
            </PaperProvider>
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

let AppExport: typeof App = App;

if (Platform.OS !== 'web' && process.env.EXPO_PUBLIC_SENTRY_DSN) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require('@sentry/react-native') as typeof import('@sentry/react-native');
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.headers?.authorization) {
        delete event.request.headers.authorization;
      }
      return event;
    },
  });
  AppExport = Sentry.wrap(App) as typeof App;
}

export default AppExport;

const styles = StyleSheet.create({
  root: Platform.select({
    web: { flex: 1, minHeight: 0 },
    default: { flex: 1 },
  }),
});

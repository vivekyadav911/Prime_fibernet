import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';

import { StyleSheet, View } from 'react-native';

import { OfflineBanner } from '@/components/common/OfflineBanner';
import { AppNavigator, linking } from '@/navigation';
import { useAuthBootstrap } from '@/hooks/useAuth';
import { SyncManager } from '@/services/offline/syncManager';
import { requestsApi } from '@/services/api/requestsApi';
import { persistor, store } from '@/store/store';

if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
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
}

function Root() {
  useAuthBootstrap();

  useEffect(() => {
    SyncManager.setExecutor(async (mutation) => {
      const op = mutation.operation ?? mutation.endpoint;
      if (op === 'updateRequestStatus') {
        const payload = mutation.payload as { id: string; status: string; note?: string };
        await store
          .dispatch(requestsApi.endpoints.updateRequestStatus.initiate(payload))
          .unwrap();
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

export default process.env.EXPO_PUBLIC_SENTRY_DSN ? Sentry.wrap(App) : App;

const styles = StyleSheet.create({
  root: { flex: 1 },
});

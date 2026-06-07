import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';

import { AppNavigator } from '@/navigation/AppNavigator';
import { useAuthBootstrap } from '@/hooks/useAuth';
import { SyncManager } from '@/services/offline/syncManager';
import { store } from '@/store/store';

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
    void SyncManager.loadQueue();
    return SyncManager.subscribeReplay(() => undefined);
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
          <PaperProvider>
            <NavigationContainer>
              <Root />
            </NavigationContainer>
          </PaperProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default process.env.EXPO_PUBLIC_SENTRY_DSN ? Sentry.wrap(App) : App;

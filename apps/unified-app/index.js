import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

// ponytail: define + register background tasks before React mounts — avoids Android
// ConcurrentModificationException when JobService reads the registry mid-register.
if (Platform.OS !== 'web') {
  require('./src/services/LocationService');
  const { registerScheduledNotificationsTask } = require('./src/tasks/scheduledNotificationsTask');
  void registerScheduledNotificationsTask().catch(() => undefined);
}

import App from './App';

registerRootComponent(App);

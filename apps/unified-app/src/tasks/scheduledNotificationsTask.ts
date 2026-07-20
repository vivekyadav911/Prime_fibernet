import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import {
  fetchDueScheduledNotifications,
  recoverStuckSendingNotifications,
  sendNotification,
} from '@/services/broadcastNotificationService';

export const SCHEDULED_NOTIFICATION_TASK = 'check-scheduled-notifications';

let registerInFlight: Promise<void> | null = null;

export function isBackgroundTaskSupported(): boolean {
  if (Platform.OS === 'web') return false;
  // Background tasks are not available in Expo Go — only in dev/production builds.
  return Constants.executionEnvironment !== 'storeClient';
}

/** Must run in global scope before any registerTaskAsync — Android JobService races otherwise. */
if (isBackgroundTaskSupported() && !TaskManager.isTaskDefined(SCHEDULED_NOTIFICATION_TASK)) {
  TaskManager.defineTask(SCHEDULED_NOTIFICATION_TASK, async () => {
    try {
      await recoverStuckSendingNotifications();
      const due = await fetchDueScheduledNotifications();
      const systemAdmin = { id: 'system', name: 'System Scheduler' };
      for (const notification of due) {
        await sendNotification(notification.id, systemAdmin);
      }
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function registerScheduledNotificationsTask(): Promise<void> {
  if (!isBackgroundTaskSupported()) return;

  if (registerInFlight) {
    await registerInFlight;
    return;
  }

  registerInFlight = (async () => {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(SCHEDULED_NOTIFICATION_TASK);
    if (isRegistered) return;

    await BackgroundTask.registerTaskAsync(SCHEDULED_NOTIFICATION_TASK, {
      minimumInterval: 15,
    });
  })();

  try {
    await registerInFlight;
  } finally {
    registerInFlight = null;
  }
}

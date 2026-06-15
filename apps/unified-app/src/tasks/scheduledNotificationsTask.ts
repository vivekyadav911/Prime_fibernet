import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  fetchDueScheduledNotifications,
  recoverStuckSendingNotifications,
  sendNotification,
} from '@/services/broadcastNotificationService';

export const SCHEDULED_NOTIFICATION_TASK = 'check-scheduled-notifications';

let taskDefined = false;

function isBackgroundTaskSupported(): boolean {
  if (Platform.OS === 'web') return false;
  // Background tasks are not available in Expo Go — only in dev/production builds.
  return Constants.executionEnvironment !== 'storeClient';
}

async function loadBackgroundTaskModule(): Promise<typeof import('expo-background-task') | null> {
  if (!isBackgroundTaskSupported()) return null;
  try {
    return await import('expo-background-task');
  } catch {
    return null;
  }
}

async function loadTaskManagerModule(): Promise<typeof import('expo-task-manager') | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-task-manager');
  } catch {
    return null;
  }
}

async function ensureTaskDefined(): Promise<boolean> {
  if (taskDefined) return true;

  const [BackgroundTask, TaskManager] = await Promise.all([
    loadBackgroundTaskModule(),
    loadTaskManagerModule(),
  ]);

  if (!BackgroundTask || !TaskManager) return false;

  if (!TaskManager.isTaskDefined(SCHEDULED_NOTIFICATION_TASK)) {
    TaskManager.defineTask(SCHEDULED_NOTIFICATION_TASK, async () => {
      try {
        await recoverStuckSendingNotifications();
        const due = await fetchDueScheduledNotifications();
        const systemAdmin = { id: 'system', name: 'System Scheduler' };
        for (const notification of due) {
          await sendNotification(notification.id, systemAdmin);
        }
        return due.length > 0
          ? BackgroundTask.BackgroundTaskResult.Success
          : BackgroundTask.BackgroundTaskResult.Success;
      } catch {
        return BackgroundTask.BackgroundTaskResult.Failed;
      }
    });
  }

  taskDefined = true;
  return true;
}

export async function registerScheduledNotificationsTask(): Promise<void> {
  if (!isBackgroundTaskSupported()) return;

  const ready = await ensureTaskDefined();
  if (!ready) return;

  const BackgroundTask = await loadBackgroundTaskModule();
  const TaskManager = await loadTaskManagerModule();
  if (!BackgroundTask || !TaskManager) return;

  const isRegistered = await TaskManager.isTaskRegisteredAsync(SCHEDULED_NOTIFICATION_TASK);
  if (isRegistered) return;

  await BackgroundTask.registerTaskAsync(SCHEDULED_NOTIFICATION_TASK, {
    minimumInterval: 15,
  });
}

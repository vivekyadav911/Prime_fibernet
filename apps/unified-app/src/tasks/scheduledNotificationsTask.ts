import { Platform } from 'react-native';

import {
  fetchDueScheduledNotifications,
  recoverStuckSendingNotifications,
  sendNotification,
} from '@/services/broadcastNotificationService';

export const SCHEDULED_NOTIFICATION_TASK = 'check-scheduled-notifications';

let taskDefined = false;

async function loadBackgroundFetchModule(): Promise<typeof import('expo-background-fetch') | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-background-fetch');
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

  const [BackgroundFetch, TaskManager] = await Promise.all([
    loadBackgroundFetchModule(),
    loadTaskManagerModule(),
  ]);

  if (!BackgroundFetch || !TaskManager) return false;

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
          ? BackgroundFetch.BackgroundFetchResult.NewData
          : BackgroundFetch.BackgroundFetchResult.NoData;
      } catch {
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }

  taskDefined = true;
  return true;
}

export async function registerScheduledNotificationsTask(): Promise<void> {
  const ready = await ensureTaskDefined();
  if (!ready) return;

  const BackgroundFetch = await loadBackgroundFetchModule();
  const TaskManager = await loadTaskManagerModule();
  if (!BackgroundFetch || !TaskManager) return;

  const isRegistered = await TaskManager.isTaskRegisteredAsync(SCHEDULED_NOTIFICATION_TASK);
  if (isRegistered) return;

  await BackgroundFetch.registerTaskAsync(SCHEDULED_NOTIFICATION_TASK, {
    minimumInterval: 15 * 60,
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

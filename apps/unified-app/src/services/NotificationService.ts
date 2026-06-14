import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export enum NotificationType {
  APPROVAL_REQUESTED = 'approval_requested',
  APPROVAL_APPROVED = 'approval_approved',
  APPROVAL_REJECTED = 'approval_rejected',
  GEOFENCE_ENTERED = 'geofence_entered',
  GEOFENCE_EXITED = 'geofence_exited',
  SHIFT_STARTING_SOON = 'shift_starting_soon',
  MISSED_CHECKOUT = 'missed_checkout',
  LATE_CHECKIN = 'late_checkin',
}

type LocalNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

class NotificationService {
  async sendLocalNotification(payload: LocalNotificationPayload): Promise<void> {
    if (Platform.OS === 'web') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      },
      trigger: null,
    });
  }

  async scheduleShiftReminder(shiftStartIso: string, geofenceName: string): Promise<void> {
    if (Platform.OS === 'web') return;

    const shiftStart = new Date(shiftStartIso);
    const reminderTime = new Date(shiftStart.getTime() - 15 * 60 * 1000);
    if (reminderTime.getTime() <= Date.now()) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Shift starting soon',
        body: `Your shift at ${geofenceName} starts in 15 minutes.`,
        data: { type: NotificationType.SHIFT_STARTING_SOON },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderTime },
    });
  }

  async scheduleMissedCheckoutReminder(shiftEndIso: string): Promise<void> {
    if (Platform.OS === 'web') return;

    const end = new Date(shiftEndIso);
    const reminder = new Date(end.getTime() + 30 * 60 * 1000);
    if (reminder.getTime() <= Date.now()) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Missed check-out?',
        body: 'You may have forgotten to check out. Please confirm your attendance.',
        data: { type: NotificationType.MISSED_CHECKOUT },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder },
    });
  }

  handleRemoteNotification(data: Record<string, unknown>): string | null {
    const type = data.type as NotificationType | undefined;
    switch (type) {
      case NotificationType.APPROVAL_APPROVED:
      case NotificationType.APPROVAL_REJECTED:
        return 'OfficerDrawer/Shifts';
      case NotificationType.APPROVAL_REQUESTED:
      case NotificationType.LATE_CHECKIN:
        return 'Admin/Attendance/ApprovalRequests';
      case NotificationType.MISSED_CHECKOUT:
        return 'OfficerDrawer/Shifts';
      default:
        return null;
    }
  }
}

export const notificationService = new NotificationService();

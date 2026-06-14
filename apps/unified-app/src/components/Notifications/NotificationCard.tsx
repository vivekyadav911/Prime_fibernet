import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { AppNotification } from '@/types/notifications';
import {
  formatAudienceLabel,
  formatEventType,
  formatSentDateTime,
  priorityBadgeColors,
} from '@/utils/notificationUtils';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type NotificationCardProps = {
  notification: AppNotification;
  onPress: () => void;
  onLongPress?: () => void;
};

export function NotificationCard({ notification, onPress, onLongPress }: NotificationCardProps) {
  const recipientCount = notification.delivery?.totalTargeted ?? notification.audience.estimatedCount;
  const priorityStyle = priorityBadgeColors(notification.priority);
  const sentAt = notification.schedule.sentAt;

  return (
    <Pressable style={styles.card} onPress={onPress} onLongPress={onLongPress}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {notification.title}
        </Text>
        <View style={styles.recipientsBadge}>
          <Text style={styles.recipientsText}>{recipientCount} recipients</Text>
        </View>
      </View>

      <View style={styles.badgeRow}>
        <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg }]}>
          <Text style={[styles.priorityText, { color: priorityStyle.text }]}>
            {notification.priority.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.audience}>{formatAudienceLabel(notification.audience)}</Text>
      <Text style={styles.message} numberOfLines={2}>
        {notification.message}
      </Text>

      <View style={styles.metaRow}>
        {sentAt ? (
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>Sent: {formatSentDateTime(sentAt)}</Text>
          </View>
        ) : null}
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>{formatEventType(notification.eventType)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceWhite,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recipientsBadge: {
    backgroundColor: '#BFDBFE',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  recipientsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  priorityBadge: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  audience: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

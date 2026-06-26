import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Button, Screen } from '@prime/ui';

import { DeliveryAnalyticsCard, formatScheduleDisplay } from '@/components/Notifications';
import { RoleGuard, SectionCard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  deleteFromHistory,
  fetchNotificationById,
  resendNotification,
} from '@/services/broadcastNotificationService';
import { useAppSelector } from '@/store/hooks';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminNotificationsStackParamList } from '@/types/navigation';
import type { AppNotification, NotificationRecipient } from '@/types/notifications';
import {
  buildRecipientsCsv,
  formatAudienceLabel,
  formatEventType,
  formatSentDateTime,
  priorityBadgeColors,
  statusBadgeColor,
} from '@/utils/notificationUtils';

type Props = NativeStackScreenProps<AdminNotificationsStackParamList, 'NotificationDetail'>;

const PAGE_SIZE = 50;

function RecipientRow({ item }: { item: NotificationRecipient }) {
  const icon =
    item.deliveryStatus === 'delivered'
      ? 'checkmark-circle'
      : item.deliveryStatus === 'failed'
        ? 'close-circle'
        : item.deliveryStatus === 'no_token'
          ? 'phone-portrait-outline'
          : 'time-outline';
  const iconColor =
    item.deliveryStatus === 'delivered'
      ? '#10B981'
      : item.deliveryStatus === 'failed'
        ? '#EF4444'
        : colors.textSecondary;

  return (
    <View style={styles.recipientRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.userName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.recipientBody}>
        <Text style={styles.recipientName}>{item.userName}</Text>
        <Text style={styles.recipientType}>{item.userType}</Text>
        {item.deliveryStatus === 'no_token' ? (
          <Text style={styles.noToken}>No push token</Text>
        ) : null}
      </View>
      <Ionicons name={icon} size={22} color={iconColor} />
    </View>
  );
}

export function NotificationDetailScreen({ navigation, route }: Props) {
  const { notificationId } = route.params;
  const user = useAppSelector((s) => s.auth.user);
  const admin = { id: user?.id ?? 'admin', name: user?.name ?? 'Admin' };
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recipientLimit, setRecipientLimit] = useState(PAGE_SIZE);
  const [namesExpanded, setNamesExpanded] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchNotificationById(notificationId);
      setNotification(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [notificationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = useCallback(async () => {
    if (!notification) return;
    const csv = buildRecipientsCsv(notification.recipients);
    const path = `${FileSystem.cacheDirectory}recipients-${notification.id}.csv`;
    await FileSystem.writeAsStringAsync(path, csv);
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export recipients' });
    } else {
      Alert.alert('Export', 'Sharing is not available on this device');
    }
  }, [notification]);

  if (loading) {
    return (
      <Screen style={adminScreenStyles.canvas}>
        <SkeletonLoader rows={8} />
      </Screen>
    );
  }

  if (error || !notification) {
    return (
      <Screen style={adminScreenStyles.canvas}>
        <ErrorState message={error ?? 'Not found'} onRetry={load} />
      </Screen>
    );
  }

  const priorityStyle = priorityBadgeColors(notification.priority);
  const sentLabel = notification.schedule.sentAt
    ? `Sent ${formatSentDateTime(notification.schedule.sentAt)}`
    : notification.schedule.isScheduled && notification.schedule.scheduledAt
      ? `Scheduled for ${formatScheduleDisplay(notification.schedule.scheduledAt)}`
      : notification.status;

  const showRecipientList = notification.recipients.length > 0 && notification.recipients.length < 500;
  const visibleRecipients = notification.recipients.slice(0, recipientLimit);

  return (
    <RoleGuard requiredPermission="notifications.view">
      <Screen style={adminScreenStyles.canvas} padded={false}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.headerCard}>
            <Text style={styles.title}>{notification.title}</Text>
            <View style={styles.badges}>
              <View style={[styles.statusBadge, { backgroundColor: statusBadgeColor(notification.status) }]}>
                <Text style={styles.statusText}>{notification.status.toUpperCase()}</Text>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg }]}>
                <Text style={[styles.priorityText, { color: priorityStyle.text }]}>
                  {notification.priority.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.sentLabel}>{sentLabel}</Text>
            <Text style={styles.eventChip}>{formatEventType(notification.eventType)}</Text>
          </View>

          {notification.delivery ? (
            <SectionCard title="Delivery Analytics">
              <DeliveryAnalyticsCard delivery={notification.delivery} />
            </SectionCard>
          ) : null}

          <SectionCard title="Message">
            <Text style={styles.msgTitle}>{notification.title}</Text>
            <Text style={styles.msgBody}>{notification.message}</Text>
            {notification.tags.length ? (
              <View style={styles.tags}>
                {notification.tags.map((t) => (
                  <Text key={t} style={styles.tag}>{t}</Text>
                ))}
              </View>
            ) : null}
          </SectionCard>

          <SectionCard title="Audience">
            <Text style={styles.audienceLabel}>{formatAudienceLabel(notification.audience)}</Text>
            <Text style={styles.audienceMeta}>
              Estimated: {notification.audience.estimatedCount} · Sent:{' '}
              {notification.delivery?.totalTargeted ?? '—'}
            </Text>
            {notification.audience.userNames?.length ? (
              <>
                <Pressable onPress={() => setNamesExpanded((v) => !v)}>
                  <Text style={styles.expandLink}>
                    {namesExpanded ? 'Hide' : 'Show'} recipient names ({notification.audience.userNames.length})
                  </Text>
                </Pressable>
                {namesExpanded ? (
                  <Text style={styles.nameList}>
                    {(notification.audience.userNames.length > 5 && !namesExpanded
                      ? notification.audience.userNames.slice(0, 5)
                      : notification.audience.userNames
                    ).join(', ')}
                  </Text>
                ) : null}
              </>
            ) : null}
          </SectionCard>

          <SectionCard title="Schedule">
            <Text style={styles.scheduleLine}>
              Type: {notification.schedule.isScheduled ? 'Scheduled' : 'Immediate'}
            </Text>
            {notification.schedule.scheduledAt ? (
              <Text style={styles.scheduleLine}>
                Scheduled: {formatScheduleDisplay(notification.schedule.scheduledAt)}
              </Text>
            ) : null}
            {notification.schedule.sentAt ? (
              <Text style={styles.scheduleLine}>
                Sent: {formatSentDateTime(notification.schedule.sentAt)}
              </Text>
            ) : null}
            <Text style={styles.scheduleLine}>Timezone: {notification.schedule.timezone}</Text>
          </SectionCard>

          <View style={styles.actions}>
            <Button
              label="Resend"
              variant="ghost"
              onPress={() => {
                Alert.alert('Resend notification?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Resend',
                    onPress: () => {
                      void resendNotification(notification.id, admin).then(() => {
                        Alert.alert('Sent', 'Notification resent successfully');
                        navigation.goBack();
                      });
                    },
                  },
                ]);
              }}
              style={styles.actionBtn}
            />
            <Button
              label="Copy as New"
              variant="ghost"
              onPress={() =>
                navigation.navigate('CreateNotification', {
                  mode: 'create',
                  prefill: {
                    title: notification.title,
                    message: notification.message,
                    priority: notification.priority,
                    eventType: notification.eventType,
                    audience: {
                      type: notification.audience.type,
                      planId: notification.audience.planId,
                      planName: notification.audience.planName,
                      area: notification.audience.area,
                      userIds: notification.audience.userIds,
                      userNames: notification.audience.userNames,
                    },
                    schedule: {
                      isScheduled: false,
                      scheduledAt: null,
                      timezone: notification.schedule.timezone,
                    },
                    tags: notification.tags,
                    deepLinkUrl: notification.deepLinkUrl ?? '',
                    imageUrl: notification.imageUrl ?? '',
                    templateId: null,
                  },
                })
              }
              style={styles.actionBtn}
            />
            <Button
              label="Delete"
              variant="ghost"
              onPress={() => {
                Alert.alert(
                  'Delete from history?',
                  'This will only remove the record from your console.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        void deleteFromHistory(notification.id).then(() => navigation.goBack());
                      },
                    },
                  ],
                );
              }}
              style={[styles.actionBtn, styles.deleteBtn]}
            />
          </View>

          {showRecipientList ? (
            <SectionCard title="Recipients">
              <FlatList
                data={visibleRecipients}
                keyExtractor={(item) => item.userId}
                renderItem={({ item }) => <RecipientRow item={item} />}
                scrollEnabled={false}
              />
              {notification.recipients.length > recipientLimit ? (
                <Button
                  label="Load more"
                  variant="ghost"
                  onPress={() => setRecipientLimit((n) => n + PAGE_SIZE)}
                />
              ) : null}
            </SectionCard>
          ) : notification.recipients.length >= 500 ? (
            <SectionCard title="Recipients">
              <Text style={styles.summaryOnly}>
                {notification.recipients.length} recipients — summary stats only
              </Text>
              <Button label="Export recipient list" variant="ghost" onPress={() => void exportCsv()} />
            </SectionCard>
          ) : null}
        </ScrollView>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.sm, paddingBottom: spacing.xxl },
  headerCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  badges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  statusBadge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  statusText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  priorityBadge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  priorityText: { fontSize: 11, fontWeight: '700' },
  sentLabel: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.sm },
  eventChip: {
    fontSize: 13,
    color: adminColors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  msgTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  msgBody: { fontSize: 15, color: colors.textPrimary, marginTop: spacing.sm, lineHeight: 22 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  tag: {
    fontSize: 12,
    backgroundColor: adminColors.primaryTint,
    color: adminColors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  audienceLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  audienceMeta: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs },
  expandLink: { color: adminColors.primary, fontWeight: '600', marginTop: spacing.sm },
  nameList: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs },
  scheduleLine: { fontSize: 14, color: colors.textPrimary, marginBottom: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.md },
  actionBtn: { flex: 1, minWidth: 100 },
  deleteBtn: { borderColor: colors.errorRed },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: adminColors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '700', color: adminColors.primary },
  recipientBody: { flex: 1 },
  recipientName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  recipientType: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  noToken: { fontSize: 11, color: colors.errorRed },
  summaryOnly: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
});

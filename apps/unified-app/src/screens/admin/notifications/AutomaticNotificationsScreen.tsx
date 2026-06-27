import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@prime/ui';

import { AudiencePickerSheet } from '@/components/Notifications';
import { AdminScreenLayout, RoleGuard, SectionCard } from '@/components/admin';
import { ErrorState, SkeletonLoader, DismissKeyboardScrollView, KeyboardDismissView, ToggleSwitch } from '@/components/common';
import type { AutomationRule, RecurringSchedule } from '@/services/broadcastNotificationService';
import {
  useCreateRecurringScheduleMutation,
  useDeleteRecurringScheduleMutation,
  useGetAutomationRulesQuery,
  useGetRecurringSchedulesQuery,
  useUpdateAutomationRuleMutation,
  useUpdateRecurringScheduleMutation,
} from '@/services/api/notificationAutomationApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminNotificationsStackParamList } from '@/types/navigation';
import type { CreateNotificationFormData, NotificationPriority } from '@/types/notifications';
import { NOTIFICATION_PRIORITIES } from '@/types/notifications';
import { formatAudienceLabel } from '@/utils/notificationUtils';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminNotificationsStackParamList, 'AutomaticNotifications'>;

const FREQUENCIES: RecurringSchedule['frequency'][] = ['daily', 'weekly', 'monthly'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_AUDIENCE: CreateNotificationFormData['audience'] = { type: 'active_users' };

export function AutomaticNotificationsScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const admin = { id: user?.id ?? 'admin', name: user?.name ?? user?.email ?? 'Admin' };

  const { data: rules, isLoading: rulesLoading, isError: rulesError, error: rulesErr, refetch: refetchRules } =
    useGetAutomationRulesQuery();
  const { data: schedules, isLoading: schedLoading, isError: schedError, error: schedErr, refetch: refetchSchedules } =
    useGetRecurringSchedulesQuery();
  const [updateRule] = useUpdateAutomationRuleMutation();
  const [createSchedule, { isLoading: creating }] = useCreateRecurringScheduleMutation();
  const [updateSchedule] = useUpdateRecurringScheduleMutation();
  const [deleteSchedule] = useDeleteRecurringScheduleMutation();

  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [editPriority, setEditPriority] = useState<NotificationPriority>('Normal');

  const [addOpen, setAddOpen] = useState(false);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleMessage, setScheduleMessage] = useState('');
  const [scheduleAudience, setScheduleAudience] = useState(DEFAULT_AUDIENCE);
  const [scheduleFrequency, setScheduleFrequency] = useState<RecurringSchedule['frequency']>('weekly');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleDay, setScheduleDay] = useState(1);

  const loading = rulesLoading || schedLoading;
  const isError = rulesError || schedError;
  const error = rulesErr ?? schedErr;

  const openEditRule = useCallback((rule: AutomationRule) => {
    setEditingRule(rule);
    setEditTitle(rule.titleTemplate);
    setEditMessage(rule.messageTemplate);
    setEditPriority(rule.priority);
  }, []);

  const saveRuleEdit = useCallback(async () => {
    if (!editingRule) return;
    try {
      await updateRule({
        id: editingRule.id,
        titleTemplate: editTitle,
        messageTemplate: editMessage,
        priority: editPriority,
      }).unwrap();
      setEditingRule(null);
      dispatch(enqueueToast({ id: `rule-${Date.now()}`, type: 'success', message: 'Rule updated' }));
    } catch (e) {
      dispatch(enqueueToast({ id: `rule-err-${Date.now()}`, type: 'error', message: queryErrorMessage(e) }));
    }
  }, [dispatch, editMessage, editPriority, editTitle, editingRule, updateRule]);

  const toggleRule = useCallback(
    async (rule: AutomationRule, enabled: boolean) => {
      try {
        await updateRule({ id: rule.id, enabled }).unwrap();
      } catch (e) {
        dispatch(enqueueToast({ id: `toggle-err-${Date.now()}`, type: 'error', message: queryErrorMessage(e) }));
      }
    },
    [dispatch, updateRule],
  );

  const toggleChannel = useCallback(
    async (rule: AutomationRule, channel: 'push' | 'in_app', value: boolean) => {
      try {
        await updateRule({
          id: rule.id,
          channels: { ...rule.channels, [channel]: value },
        }).unwrap();
      } catch (e) {
        dispatch(enqueueToast({ id: `ch-err-${Date.now()}`, type: 'error', message: queryErrorMessage(e) }));
      }
    },
    [dispatch, updateRule],
  );

  const resetScheduleForm = useCallback(() => {
    setScheduleName('');
    setScheduleTitle('');
    setScheduleMessage('');
    setScheduleAudience(DEFAULT_AUDIENCE);
    setScheduleFrequency('weekly');
    setScheduleTime('09:00');
    setScheduleDay(1);
  }, []);

  const handleCreateSchedule = useCallback(async () => {
    if (!scheduleName.trim() || !scheduleTitle.trim() || !scheduleMessage.trim()) {
      dispatch(enqueueToast({ id: `sched-val-${Date.now()}`, type: 'error', message: 'Fill in name, title, and message' }));
      return;
    }
    try {
      await createSchedule({
        name: scheduleName.trim(),
        title: scheduleTitle.trim(),
        message: scheduleMessage.trim(),
        priority: 'Normal',
        eventType: 'none',
        audience: scheduleAudience,
        frequency: scheduleFrequency,
        timeOfDay: scheduleTime,
        dayOfWeek: scheduleFrequency === 'daily' ? null : scheduleDay,
        timezone: 'Asia/Kolkata',
        enabled: true,
        createdBy: admin,
      }).unwrap();
      setAddOpen(false);
      resetScheduleForm();
      dispatch(enqueueToast({ id: `sched-ok-${Date.now()}`, type: 'success', message: 'Recurring schedule created' }));
    } catch (e) {
      dispatch(enqueueToast({ id: `sched-err-${Date.now()}`, type: 'error', message: queryErrorMessage(e) }));
    }
  }, [
    admin,
    createSchedule,
    dispatch,
    resetScheduleForm,
    scheduleAudience,
    scheduleDay,
    scheduleFrequency,
    scheduleMessage,
    scheduleName,
    scheduleTime,
    scheduleTitle,
  ]);

  const toggleSchedule = useCallback(
    async (schedule: RecurringSchedule, enabled: boolean) => {
      try {
        await updateSchedule({ id: schedule.id, enabled }).unwrap();
      } catch (e) {
        dispatch(enqueueToast({ id: `sched-tog-err-${Date.now()}`, type: 'error', message: queryErrorMessage(e) }));
      }
    },
    [dispatch, updateSchedule],
  );

  const confirmDeleteSchedule = useCallback(
    (schedule: RecurringSchedule) => {
      Alert.alert('Delete schedule?', `Remove "${schedule.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteSchedule(schedule.id)
              .unwrap()
              .then(() =>
                dispatch(enqueueToast({ id: `del-${Date.now()}`, type: 'success', message: 'Schedule deleted' })),
              )
              .catch((e) =>
                dispatch(enqueueToast({ id: `del-err-${Date.now()}`, type: 'error', message: queryErrorMessage(e) })),
              );
          },
        },
      ]);
    },
    [deleteSchedule, dispatch],
  );

  const renderRule = useCallback(
    ({ item }: { item: AutomationRule }) => (
      <View style={styles.ruleCard}>
        <View style={styles.ruleHeader}>
          <View style={styles.ruleTitleCol}>
            <Text style={styles.ruleTitle}>{item.label}</Text>
            {item.description ? <Text style={styles.ruleDesc}>{item.description}</Text> : null}
          </View>
          <ToggleSwitch value={item.enabled} onValueChange={(v) => void toggleRule(item, v)} />
        </View>
        <View style={styles.channelRow}>
          <Pressable
            style={[styles.channelChip, item.channels.push && styles.channelChipActive]}
            onPress={() => void toggleChannel(item, 'push', !item.channels.push)}
          >
            <Text style={[styles.channelText, item.channels.push && styles.channelTextActive]}>Push</Text>
          </Pressable>
          <Pressable
            style={[styles.channelChip, item.channels.in_app && styles.channelChipActive]}
            onPress={() => void toggleChannel(item, 'in_app', !item.channels.in_app)}
          >
            <Text style={[styles.channelText, item.channels.in_app && styles.channelTextActive]}>In-app</Text>
          </Pressable>
        </View>
        <Pressable style={styles.editBtn} onPress={() => openEditRule(item)}>
          <Ionicons name="create-outline" size={16} color={adminColors.primary} />
          <Text style={styles.editBtnText}>Edit template</Text>
        </Pressable>
      </View>
    ),
    [openEditRule, toggleChannel, toggleRule],
  );

  const renderSchedule = useCallback(
    ({ item }: { item: RecurringSchedule }) => (
      <View style={styles.ruleCard}>
        <View style={styles.ruleHeader}>
          <View style={styles.ruleTitleCol}>
            <Text style={styles.ruleTitle}>{item.name}</Text>
            <Text style={styles.ruleDesc}>
              {item.frequency} at {item.timeOfDay} · {formatAudienceLabel({ ...item.audience, estimatedCount: 0 })}
            </Text>
            {item.nextRunAt ? (
              <Text style={styles.ruleMeta}>Next: {item.nextRunAt.toLocaleString()}</Text>
            ) : null}
          </View>
          <ToggleSwitch value={item.enabled} onValueChange={(v) => void toggleSchedule(item, v)} />
        </View>
        <Text style={styles.schedulePreview} numberOfLines={2}>
          {item.title}: {item.message}
        </Text>
        <Pressable style={styles.deleteBtn} onPress={() => confirmDeleteSchedule(item)}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </Pressable>
      </View>
    ),
    [confirmDeleteSchedule, toggleSchedule],
  );

  if (loading) {
    return (
      <RoleGuard requiredPermission="notifications.view">
        <AdminScreenLayout>
          <SkeletonLoader rows={8} />
        </AdminScreenLayout>
      </RoleGuard>
    );
  }

  if (isError) {
    return (
      <RoleGuard requiredPermission="notifications.view">
        <AdminScreenLayout>
          <ErrorState
            message={queryErrorMessage(error)}
            onRetry={() => {
              void refetchRules();
              void refetchSchedules();
            }}
          />
        </AdminScreenLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredPermission="notifications.view">
      <>
        <AdminScreenLayout scroll contentStyle={styles.content}>
          <SectionCard title="Event Triggers">
            <Text style={styles.sectionHint}>
              Automatic notifications fired by system events. Use {'{variable}'} placeholders in templates.
            </Text>
            <FlatList
              data={rules ?? []}
              keyExtractor={(item) => item.id}
              renderItem={renderRule}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.empty}>No automation rules configured</Text>}
            />
          </SectionCard>

          <SectionCard title="Recurring Broadcasts">
            <Text style={styles.sectionHint}>
              Scheduled broadcasts sent automatically on a recurring basis (processed server-side).
            </Text>
            <Button label="+ Add recurring schedule" variant="ghost" onPress={() => setAddOpen(true)} />
            <FlatList
              data={schedules ?? []}
              keyExtractor={(item) => item.id}
              renderItem={renderSchedule}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.empty}>No recurring schedules yet</Text>}
            />
          </SectionCard>
        </AdminScreenLayout>

        <Modal visible={!!editingRule} animationType="slide" transparent onRequestClose={() => setEditingRule(null)}>
          <Pressable
            style={[styles.modalBackdrop, { paddingTop: insets.top }]}
            onPress={() => {
              Keyboard.dismiss();
              setEditingRule(null);
            }}
          >
            <KeyboardDismissView>
              <Pressable
                style={[styles.modalCard, { paddingBottom: spacing.md + insets.bottom }]}
                onPress={(e) => e.stopPropagation()}
              >
              <Text style={styles.modalTitle}>Edit template — {editingRule?.label}</Text>
              <Text style={styles.label}>TITLE TEMPLATE</Text>
              <TextInput style={styles.input} value={editTitle} onChangeText={setEditTitle} />
              <Text style={styles.label}>MESSAGE TEMPLATE</Text>
              <TextInput style={[styles.input, styles.multiline]} value={editMessage} onChangeText={setEditMessage} multiline />
              <Text style={styles.label}>PRIORITY</Text>
              <View style={styles.pillRow}>
                {NOTIFICATION_PRIORITIES.map((p) => (
                  <Pressable
                    key={p}
                    style={[styles.pill, editPriority === p && styles.pillActive]}
                    onPress={() => setEditPriority(p)}
                  >
                    <Text style={[styles.pillText, editPriority === p && styles.pillTextActive]}>{p}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.modalActions}>
                <Button label="Cancel" variant="ghost" onPress={() => setEditingRule(null)} style={styles.modalBtn} />
                <Button label="Save" onPress={() => void saveRuleEdit()} style={styles.modalBtn} />
              </View>
              </Pressable>
            </KeyboardDismissView>
          </Pressable>
        </Modal>

        <Modal visible={addOpen} animationType="slide" transparent onRequestClose={() => setAddOpen(false)}>
          <Pressable
            style={[styles.modalBackdrop, { paddingTop: insets.top }]}
            onPress={() => {
              Keyboard.dismiss();
              setAddOpen(false);
            }}
          >
            <DismissKeyboardScrollView contentContainerStyle={styles.modalScroll}>
              <KeyboardDismissView>
              <Pressable
                style={[styles.modalCard, { paddingBottom: spacing.md + insets.bottom }]}
                onPress={(e) => e.stopPropagation()}
              >
                <Text style={styles.modalTitle}>New recurring broadcast</Text>
                <Text style={styles.label}>SCHEDULE NAME</Text>
                <TextInput style={styles.input} value={scheduleName} onChangeText={setScheduleName} placeholder="Weekly payment reminder" />
                <Text style={styles.label}>TITLE</Text>
                <TextInput style={styles.input} value={scheduleTitle} onChangeText={setScheduleTitle} />
                <Text style={styles.label}>MESSAGE</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={scheduleMessage}
                  onChangeText={setScheduleMessage}
                  multiline
                />
                <Text style={styles.label}>AUDIENCE</Text>
                <Pressable style={styles.audienceBtn} onPress={() => setAudienceOpen(true)}>
                  <Text style={styles.audienceText}>{formatAudienceLabel({ ...scheduleAudience, estimatedCount: 0 })}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>
                <Text style={styles.label}>FREQUENCY</Text>
                <View style={styles.pillRow}>
                  {FREQUENCIES.map((f) => (
                    <Pressable
                      key={f}
                      style={[styles.pill, scheduleFrequency === f && styles.pillActive]}
                      onPress={() => setScheduleFrequency(f)}
                    >
                      <Text style={[styles.pillText, scheduleFrequency === f && styles.pillTextActive]}>{f}</Text>
                    </Pressable>
                  ))}
                </View>
                {scheduleFrequency !== 'daily' ? (
                  <>
                    <Text style={styles.label}>DAY</Text>
                    <View style={styles.pillRow}>
                      {DAY_LABELS.map((d, i) => (
                        <Pressable
                          key={d}
                          style={[styles.pill, scheduleDay === i && styles.pillActive]}
                          onPress={() => setScheduleDay(i)}
                        >
                          <Text style={[styles.pillText, scheduleDay === i && styles.pillTextActive]}>{d}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : null}
                <Text style={styles.label}>TIME (HH:MM, IST)</Text>
                <TextInput style={styles.input} value={scheduleTime} onChangeText={setScheduleTime} placeholder="09:00" />
                <View style={styles.modalActions}>
                  <Button label="Cancel" variant="ghost" onPress={() => setAddOpen(false)} style={styles.modalBtn} />
                  <Button
                    label={creating ? 'Saving…' : 'Create'}
                    onPress={() => void handleCreateSchedule()}
                    disabled={creating}
                    style={styles.modalBtn}
                  />
                </View>
              </Pressable>
              </KeyboardDismissView>
            </DismissKeyboardScrollView>
          </Pressable>
        </Modal>

        <AudiencePickerSheet
          visible={audienceOpen}
          audience={scheduleAudience}
          onClose={() => setAudienceOpen(false)}
          onConfirm={(audience) => {
            setScheduleAudience(audience);
            setAudienceOpen(false);
          }}
        />
      </>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  sectionHint: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm },
  ruleCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  ruleHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  ruleTitleCol: { flex: 1 },
  ruleTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  ruleDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  ruleMeta: { fontSize: 12, color: adminColors.primary, marginTop: 4, fontWeight: '600' },
  channelRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  channelChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  channelChipActive: { backgroundColor: adminColors.primaryTint, borderColor: adminColors.primary },
  channelText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  channelTextActive: { color: adminColors.primary },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  editBtnText: { color: adminColors.primary, fontWeight: '600', fontSize: 13 },
  schedulePreview: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs },
  deleteBtn: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  deleteBtnText: { color: colors.errorRed, fontWeight: '600', fontSize: 13 },
  empty: { fontSize: 13, color: colors.textSecondary, paddingVertical: spacing.md },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceWhite,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  pillActive: { backgroundColor: adminColors.primary, borderColor: adminColors.primary },
  pillText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', textTransform: 'capitalize' },
  pillTextActive: { color: colors.white },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalBtn: { flex: 1 },
  audienceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  audienceText: { fontSize: 15, color: colors.textPrimary },
});

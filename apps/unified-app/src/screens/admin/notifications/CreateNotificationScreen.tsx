import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  AudiencePickerSheet,
  EventTypeSelector,
  NotificationPreviewCard,
  PrioritySelector,
  SchedulePickerModal,
  SendProgressModal,
  formatScheduleDisplay,
} from '@/components/Notifications';
import { AdminButton, AdminScreenLayout, RoleGuard, SectionCard } from '@/components/admin';
import { SkeletonLoader, DismissKeyboardScrollView, ToggleSwitch } from '@/components/common';
import { useCreateNotification } from '@/hooks/useCreateNotification';
import { fetchNotificationById } from '@/services/broadcastNotificationService';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { switchTheme } from '@/theme/switchTheme';
import type { AdminNotificationsStackParamList } from '@/types/navigation';
import type { AppNotification } from '@/types/notifications';
import { formatAudienceLabel } from '@/utils/notificationUtils';

type Props = NativeStackScreenProps<AdminNotificationsStackParamList, 'CreateNotification'>;

function counterColor(current: number, warn: number, max: number): string {
  if (current >= max) return '#EF4444';
  if (current >= warn) return '#F59E0B';
  return '#9CA3AF';
}

export function CreateNotificationScreen({ navigation, route }: Props) {
  const { mode, notificationId, prefill } = route.params;
  const [existing, setExisting] = useState<AppNotification | undefined>();
  const [loadingExisting, setLoadingExisting] = useState(mode === 'edit' && !!notificationId);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (mode === 'edit' && notificationId) {
      void fetchNotificationById(notificationId)
        .then(setExisting)
        .finally(() => setLoadingExisting(false));
    }
  }, [mode, notificationId]);

  const {
    formData,
    errors,
    updateField,
    updateAudience,
    updateSchedule,
    estimatedRecipientCount,
    isResolvingCount,
    titleLength,
    messageLength,
    saveDraft,
    sendNow,
    scheduleIt,
    isSubmitting,
    isSavingDraft,
    templates,
    applyTemplate,
    saveAsTemplate,
    sendProgress,
    validateForSend,
  } = useCreateNotification(existing, prefill);
  const dispatch = useAppDispatch();

  const confirmAndSend = useCallback(() => {
    if (!validateForSend()) {
      dispatch(enqueueToast({
        id: `confirm-val-${Date.now()}`,
        type: 'error',
        message: 'Please fix the highlighted fields before sending.',
      }));
      return;
    }
    Alert.alert(
      `Send to ${estimatedRecipientCount} recipients?`,
      `Title: ${formData.title}\nAudience: ${formatAudienceLabel({ ...formData.audience, estimatedCount: estimatedRecipientCount })}\nPriority: ${formData.priority}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: formData.schedule.isScheduled ? 'Schedule' : 'Send',
          onPress: () => {
            void (async () => {
              if (formData.schedule.isScheduled) {
                const ok = await scheduleIt();
                if (ok) navigation.goBack();
              } else {
                const result = await sendNow();
                if (result) navigation.goBack();
              }
            })();
          },
        },
      ],
    );
  }, [estimatedRecipientCount, formData, navigation, scheduleIt, sendNow, validateForSend, dispatch]);

  const addTag = useCallback(() => {
    const tag = tagInput.trim().replace(/,$/, '');
    if (!tag || formData.tags.includes(tag)) return;
    updateField('tags', [...formData.tags, tag]);
    setTagInput('');
  }, [formData.tags, tagInput, updateField]);

  if (loadingExisting) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={8} />
      </AdminScreenLayout>
    );
  }

  return (
    <RoleGuard requiredPermission="notifications.create">
      <AdminScreenLayout>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.flex}>
          <DismissKeyboardScrollView contentContainerStyle={styles.scroll}>
            <SectionCard title="Content">
              <Text style={styles.label}>NOTIFICATION TITLE *</Text>
              <TextInput
                style={styles.input}
                placeholder="Notification Title *"
                value={formData.title}
                onChangeText={(t) => updateField('title', t.slice(0, 100))}
                maxLength={100}
              />
              <Text style={[styles.counter, { color: counterColor(titleLength, 80, 100) }]}>
                {titleLength}/100
              </Text>
              {errors.title ? <Text style={styles.error}>{errors.title}</Text> : null}

              <Text style={styles.label}>NOTIFICATION MESSAGE *</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={formData.message}
                onChangeText={(t) => updateField('message', t.slice(0, 500))}
                multiline
                numberOfLines={5}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={[styles.counter, { color: counterColor(messageLength, 400, 500) }]}>
                {messageLength}/500
              </Text>
              {errors.message ? <Text style={styles.error}>{errors.message}</Text> : null}

              <Pressable style={styles.collapseHeader} onPress={() => setPreviewOpen((v) => !v)}>
                <Text style={styles.collapseTitle}>Preview</Text>
                <Ionicons name={previewOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
              </Pressable>
              {previewOpen ? (
                <NotificationPreviewCard title={formData.title} message={formData.message} />
              ) : null}
            </SectionCard>

            <SectionCard title="Priority Level">
              <PrioritySelector value={formData.priority} onChange={(p) => updateField('priority', p)} />
            </SectionCard>

            <SectionCard title="Event Type (Optional)">
              <EventTypeSelector value={formData.eventType} onChange={(e) => updateField('eventType', e)} />
            </SectionCard>

            <SectionCard title="Target Audience *">
              <Pressable style={styles.audienceTrigger} onPress={() => setAudienceOpen(true)}>
                <Ionicons name="people-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.audienceText}>
                  {formatAudienceLabel({ ...formData.audience, estimatedCount: estimatedRecipientCount })}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
              {isResolvingCount ? (
                <Text style={styles.resolving}>Calculating recipients...</Text>
              ) : (
                <Text style={styles.recipientCount}>{estimatedRecipientCount} recipients</Text>
              )}
              {errors.audience ? <Text style={styles.error}>{errors.audience}</Text> : null}
            </SectionCard>

            <SectionCard title="">
              <Pressable style={styles.collapseHeader} onPress={() => setTemplatesOpen((v) => !v)}>
                <Text style={styles.collapseTitle}>Use Template</Text>
                <Ionicons name={templatesOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
              </Pressable>
              {templatesOpen ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
                  {templates.map((t) => (
                    <Pressable key={t.id} style={styles.templateCard} onPress={() => applyTemplate(t)}>
                      <Text style={styles.templateName}>{t.name}</Text>
                      <Text style={styles.templatePreview} numberOfLines={2}>{t.title}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
              {templatesOpen ? (
                <AdminButton
                  label="+ Save as Template"
                  variant="ghost"
                  onPress={() => {
                    Alert.prompt?.('Template name', undefined, (name) => {
                      if (name) void saveAsTemplate(name);
                    });
                    if (!Alert.prompt) void saveAsTemplate(`Template ${Date.now()}`);
                  }}
                />
              ) : null}
            </SectionCard>

            <SectionCard title="">
              <Pressable style={styles.collapseHeader} onPress={() => setAdvancedOpen((v) => !v)}>
                <Text style={styles.collapseTitle}>Advanced Options</Text>
                <Ionicons name={advancedOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
              </Pressable>
              {advancedOpen ? (
                <>
                  <Text style={styles.label}>TAGS</Text>
                  <View style={styles.tagRow}>
                    <TextInput
                      style={[styles.input, styles.tagInput]}
                      value={tagInput}
                      onChangeText={setTagInput}
                      placeholder="Add tag, press Enter"
                      onSubmitEditing={addTag}
                    />
                  </View>
                  <View style={styles.chips}>
                    {formData.tags.map((tag) => (
                      <Pressable
                        key={tag}
                        style={styles.chip}
                        onPress={() => updateField('tags', formData.tags.filter((t) => t !== tag))}
                      >
                        <Text style={styles.chipText}>{tag} ×</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.label}>DEEP LINK URL</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.deepLinkUrl}
                    onChangeText={(v) => updateField('deepLinkUrl', v)}
                    placeholder="primefiber:// or https://"
                    autoCapitalize="none"
                  />
                  {errors.deepLinkUrl ? <Text style={styles.error}>{errors.deepLinkUrl}</Text> : null}
                  <Text style={styles.label}>IMAGE URL</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.imageUrl}
                    onChangeText={(v) => updateField('imageUrl', v)}
                    placeholder="https://..."
                    autoCapitalize="none"
                  />
                </>
              ) : null}
            </SectionCard>

            <SectionCard title="">
              <View style={styles.scheduleHeader}>
                <Text style={styles.scheduleTitle}>Schedule</Text>
                <ToggleSwitch
                  value={formData.schedule.isScheduled}
                  onValueChange={(v) => updateSchedule({ ...formData.schedule, isScheduled: v })}
                  accentColor={switchTheme.accentTeal}
                />
              </View>
              {formData.schedule.isScheduled ? (
                <>
                  <Pressable style={styles.scheduleRow} onPress={() => setScheduleOpen(true)}>
                    <Text style={styles.scheduleLabel}>Scheduled Date & Time</Text>
                    <Text style={styles.scheduleValue}>
                      {formData.schedule.scheduledAt
                        ? formatScheduleDisplay(formData.schedule.scheduledAt)
                        : 'Select date & time'}
                    </Text>
                    <Text style={styles.changeBtn}>Change</Text>
                  </Pressable>
                  <Text style={styles.tz}>IST ({formData.schedule.timezone})</Text>
                  {errors.schedule ? <Text style={styles.error}>{errors.schedule}</Text> : null}
                </>
              ) : (
                <Text style={styles.scheduleHint}>Sends immediately on Send Now</Text>
              )}
            </SectionCard>
          </DismissKeyboardScrollView>

          <View style={styles.footer}>
            <AdminButton
              label={isSavingDraft ? 'Saving…' : '💾 Save Draft'}
              variant="ghost"
              onPress={() => void saveDraft()}
              style={styles.footerBtn}
            />
            <AdminButton
              label={
                isSubmitting
                  ? 'Sending…'
                  : formData.schedule.isScheduled
                    ? '📅 Schedule'
                    : '▶ Send Now'
              }
              onPress={confirmAndSend}
              disabled={isSubmitting}
              style={styles.footerBtn}
            />
          </View>
          </View>
        </KeyboardAvoidingView>

        <AudiencePickerSheet
          visible={audienceOpen}
          audience={formData.audience}
          onClose={() => setAudienceOpen(false)}
          onConfirm={(audience) => {
            updateAudience(audience);
            setAudienceOpen(false);
          }}
        />

        <SchedulePickerModal
          visible={scheduleOpen}
          value={formData.schedule.scheduledAt}
          timezone={formData.schedule.timezone}
          onClose={() => setScheduleOpen(false)}
          onConfirm={(date) => {
            updateSchedule({ ...formData.schedule, scheduledAt: date });
            setScheduleOpen(false);
          }}
        />

        <SendProgressModal visible={!!sendProgress} progress={sendProgress} />
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.sm, paddingBottom: spacing.xxl },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  input: {
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  multiline: { minHeight: 100 },
  counter: { textAlign: 'right', fontSize: 12, marginTop: 2 },
  error: { color: colors.errorRed, fontSize: 12, marginTop: spacing.xs },
  collapseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  collapseTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  audienceTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  audienceText: { flex: 1, fontSize: 15, color: colors.textPrimary },
  resolving: { fontSize: 13, color: colors.textSecondary },
  recipientCount: { fontSize: 13, fontWeight: '600', color: adminColors.primary },
  templateScroll: { marginVertical: spacing.sm },
  templateCard: {
    width: 160,
    padding: spacing.sm,
    marginRight: spacing.sm,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: radius.sm,
  },
  templateName: { fontWeight: '700', fontSize: 13, color: colors.textPrimary },
  templatePreview: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  tagRow: { flexDirection: 'row' },
  tagInput: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  chip: {
    backgroundColor: adminColors.primaryTint,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipText: { fontSize: 13, color: adminColors.primary },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  scheduleRow: { marginTop: spacing.md },
  scheduleLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  scheduleValue: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginTop: spacing.xs },
  changeBtn: { color: adminColors.primary, fontWeight: '600', marginTop: spacing.xs },
  tz: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs },
  scheduleHint: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  footerBtn: { flex: 1 },
});

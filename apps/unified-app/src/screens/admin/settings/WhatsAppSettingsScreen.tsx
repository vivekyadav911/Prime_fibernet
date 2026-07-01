import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@prime/ui';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { AdminScreenLayout, FormField, RoleGuard } from '@/components/admin';
import {
  SaveButton,
  SettingsHubLayout,
  SettingsRow,
  SettingsSection,
} from '@/components/admin/settings';
import {
  DismissKeyboardScrollView,
  ErrorState,
  SkeletonLoader,
} from '@/components/common';
import {
  useGetWhatsAppGatewayStatusQuery,
  useGetWhatsAppSettingsQuery,
  useUpdateWhatsAppSettingsMutation,
  type WhatsAppSettings,
} from '@/services/api/whatsappApi';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminSettingsStackParamList } from '@/types/navigation';
import { queryErrorMessage } from '@/utils/queryError';

const schema = z.object({
  enabled: z.boolean(),
  gatewayUrl: z.string().url('Enter a valid gateway URL'),
  gatewaySessionId: z.string().min(1, 'Session ID is required'),
  notifyPayment: z.boolean(),
  notifyInvoice: z.boolean(),
  notifyComplaints: z.boolean(),
  notifyActivations: z.boolean(),
  paymentReceiptTemplate: z.string().min(10, 'Template is too short'),
  invoiceTemplate: z.string().min(10, 'Template is too short'),
  complaintUpdateTemplate: z.string().min(10, 'Template is too short'),
  activationTemplate: z.string().min(10, 'Template is too short'),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  enabled: false,
  gatewayUrl: 'http://localhost:2785',
  gatewaySessionId: '',
  notifyPayment: true,
  notifyInvoice: true,
  notifyComplaints: false,
  notifyActivations: false,
  paymentReceiptTemplate: '',
  invoiceTemplate: '',
  complaintUpdateTemplate: '',
  activationTemplate: '',
};

function mapSettingsToFormValues(settings: WhatsAppSettings): FormValues {
  return {
    enabled: settings.enabled,
    gatewayUrl: settings.gatewayUrl,
    gatewaySessionId: settings.gatewaySessionId,
    notifyPayment: settings.notifyPayment,
    notifyInvoice: settings.notifyInvoice,
    notifyComplaints: settings.notifyComplaints,
    notifyActivations: settings.notifyActivations,
    paymentReceiptTemplate: settings.paymentReceiptTemplate,
    invoiceTemplate: settings.invoiceTemplate,
    complaintUpdateTemplate: settings.complaintUpdateTemplate,
    activationTemplate: settings.activationTemplate,
  };
}

export function WhatsAppSettingsScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<AdminSettingsStackParamList>>();
  const settingsQuery = useGetWhatsAppSettingsQuery();
  const statusQuery = useGetWhatsAppGatewayStatusQuery(undefined, {
    pollingInterval: 60000,
  });
  const [updateSettings, { isLoading: saving }] = useUpdateWhatsAppSettingsMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      reset(mapSettingsToFormValues(settingsQuery.data));
    }
  }, [reset, settingsQuery.data]);

  const handleSave = handleSubmit(async (values) => {
    try {
      await updateSettings(values).unwrap();
      dispatch(enqueueToast({
        id: Date.now().toString(),
        type: 'success',
        message: 'WhatsApp settings saved',
      }));
    } catch (error) {
      dispatch(enqueueToast({
        id: Date.now().toString(),
        type: 'error',
        message: queryErrorMessage(error),
      }));
    }
  });

  if (settingsQuery.isLoading) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={10} />
      </AdminScreenLayout>
    );
  }

  if (settingsQuery.isError) {
    return (
      <AdminScreenLayout>
        <ErrorState message={queryErrorMessage(settingsQuery.error)} onRetry={settingsQuery.refetch} />
      </AdminScreenLayout>
    );
  }

  const statusText = statusQuery.data?.connected
    ? 'Connected'
    : statusQuery.data?.error ?? (statusQuery.data?.enabled ? 'Disconnected' : 'Disabled');

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminScreenLayout>
        <SettingsHubLayout activeRoute="WhatsAppSettings">
          <DismissKeyboardScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <SettingsSection
              title="Gateway Status"
              actionLabel="Logs"
              onAction={() => navigation.navigate('WhatsAppLogs')}
            >
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    statusQuery.data?.connected
                      ? styles.statusConnected
                      : statusQuery.data?.enabled
                        ? styles.statusDisconnected
                        : styles.statusDisabled,
                  ]}
                />
                <View style={styles.statusTextCol}>
                  <Text style={styles.statusLabel}>{statusText}</Text>
                  <Text style={styles.statusMeta}>
                    {statusQuery.data?.sessionStatus
                      ? `Session status: ${statusQuery.data.sessionStatus}`
                      : 'Health checks use /api/health and /api/sessions/{sessionId}.'}
                  </Text>
                </View>
              </View>
              <View style={styles.actionsRow}>
                <Button
                  label={statusQuery.isFetching ? 'Checking…' : 'Refresh status'}
                  variant="secondary"
                  onPress={() => void statusQuery.refetch()}
                  disabled={statusQuery.isFetching}
                />
              </View>
            </SettingsSection>

            <SettingsSection title="Master Control">
              <Controller
                control={control}
                name="enabled"
                render={({ field: { value, onChange } }) => (
                  <SettingsRow
                    label="Enable WhatsApp notifications"
                    description="Turns the OpenWA integration on for transactional sends."
                    value={value}
                    onValueChange={onChange}
                  />
                )}
              />
            </SettingsSection>

            <SettingsSection title="Gateway Connection">
              <Controller
                control={control}
                name="gatewayUrl"
                render={({ field: { value, onBlur, onChange } }) => (
                  <FormField
                    label="Gateway URL"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    autoCapitalize="none"
                    keyboardType="url"
                    placeholder="https://openwa.example.com"
                    helperText="Use a public HTTPS URL for hosted Supabase, or a LAN/private URL for self-hosted functions."
                    error={errors.gatewayUrl?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="gatewaySessionId"
                render={({ field: { value, onBlur, onChange } }) => (
                  <FormField
                    label="Session ID"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    autoCapitalize="none"
                    placeholder="default"
                    helperText="This must match the session created in the OpenWA dashboard."
                    error={errors.gatewaySessionId?.message}
                  />
                )}
              />
            </SettingsSection>

            <SettingsSection title="Notification Types">
              <Controller
                control={control}
                name="notifyPayment"
                render={({ field: { value, onChange } }) => (
                  <SettingsRow label="Payment receipts" value={value} onValueChange={onChange} />
                )}
              />
              <Controller
                control={control}
                name="notifyInvoice"
                render={({ field: { value, onChange } }) => (
                  <SettingsRow label="Invoices" value={value} onValueChange={onChange} />
                )}
              />
              <Controller
                control={control}
                name="notifyComplaints"
                render={({ field: { value, onChange } }) => (
                  <SettingsRow label="Complaint updates" value={value} onValueChange={onChange} />
                )}
              />
              <Controller
                control={control}
                name="notifyActivations"
                render={({ field: { value, onChange } }) => (
                  <SettingsRow label="Activations" value={value} onValueChange={onChange} />
                )}
              />
            </SettingsSection>

            <SettingsSection title="Message Templates">
              <Text style={styles.templateHint}>
                {"Supported placeholders include {{customer_name}}, {{amount}}, {{date}}, {{receipt_number}}, {{invoice_number}}, {{due_date}}, {{complaint_id}}, {{status}}, {{message}}, and {{plan_name}}."}
              </Text>
              <Controller
                control={control}
                name="paymentReceiptTemplate"
                render={({ field: { value, onBlur, onChange } }) => (
                  <FormField
                    label="Payment receipt template"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    multiline
                    error={errors.paymentReceiptTemplate?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="invoiceTemplate"
                render={({ field: { value, onBlur, onChange } }) => (
                  <FormField
                    label="Invoice template"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    multiline
                    error={errors.invoiceTemplate?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="complaintUpdateTemplate"
                render={({ field: { value, onBlur, onChange } }) => (
                  <FormField
                    label="Complaint update template"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    multiline
                    error={errors.complaintUpdateTemplate?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="activationTemplate"
                render={({ field: { value, onBlur, onChange } }) => (
                  <FormField
                    label="Activation template"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    multiline
                    error={errors.activationTemplate?.message}
                  />
                )}
              />
            </SettingsSection>

            <SaveButton
              label="Save WhatsApp Settings"
              onPress={() => void handleSave()}
              loading={saving}
              disabled={!isDirty}
            />
          </DismissKeyboardScrollView>
        </SettingsHubLayout>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusConnected: {
    backgroundColor: adminColors.badgeActive,
  },
  statusDisconnected: {
    backgroundColor: colors.errorRed,
  },
  statusDisabled: {
    backgroundColor: colors.textSecondary,
  },
  statusTextCol: {
    flex: 1,
    gap: spacing.xxs,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionsRow: {
    marginTop: spacing.md,
  },
  templateHint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
});

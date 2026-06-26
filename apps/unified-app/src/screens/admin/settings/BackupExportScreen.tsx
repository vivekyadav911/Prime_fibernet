import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Screen } from '@prime/ui';

import { ExportButton, RoleGuard } from '@/components/admin';
import {
  SaveButton,
  SettingsHubLayout,
  SettingsRow,
  SettingsSection,
  SettingsSelect,
  SettingsSlider,
} from '@/components/admin/settings';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  useDeleteBackupFileMutation,
  useExportSettingsXlsxMutation,
  useGetAppSettingsQuery,
  useGetBackupFilesQuery,
  useTriggerSqlBackupMutation,
  useUpdateAppSettingsSectionMutation,
} from '@/store/api/endpoints';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AppSettings } from '@/types/settings';
import { queryErrorMessage } from '@/utils/queryError';
import { shareBlob } from '@/utils/shareFile';

const FREQUENCY_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];
const LOCATION_OPTIONS = [
  { value: 'cloud', label: 'Cloud Storage' },
  { value: 'local', label: 'Local' },
];

export function BackupExportScreen() {
  const dispatch = useAppDispatch();
  const [edgeWarning, setEdgeWarning] = useState(false);
  const { data, isLoading, isError, error, refetch } = useGetAppSettingsQuery();
  const { data: backups, refetch: refetchBackups } = useGetBackupFilesQuery();
  const [updateSection, { isLoading: saving }] = useUpdateAppSettingsSectionMutation();
  const [triggerBackup, { isLoading: backingUp }] = useTriggerSqlBackupMutation();
  const [deleteBackup] = useDeleteBackupFileMutation();
  const [exportXlsx] = useExportSettingsXlsxMutation();
  const [form, setForm] = useState<Partial<AppSettings>>({});

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await updateSection({
        section: 'backup',
        updates: form,
        description: 'Updated backup settings',
      }).unwrap();
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Backup settings saved' }));
    } catch (e) {
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: queryErrorMessage(e) }));
    }
  };

  const runExport = async (action: string) => {
    try {
      const result = await exportXlsx({ action }).unwrap();
      await shareBlob(result.blob, result.filename);
    } catch (e) {
      setEdgeWarning(true);
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: queryErrorMessage(e) }));
    }
  };

  const onCreateBackup = async () => {
    try {
      await triggerBackup().unwrap();
      await refetchBackups();
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Backup created' }));
    } catch (e) {
      setEdgeWarning(true);
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: queryErrorMessage(e) }));
    }
  };

  const body = isLoading ? (
    <SkeletonLoader rows={8} />
  ) : isError ? (
    <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
  ) : (
    <>
      {edgeWarning ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Backup/export requires the admin-backup-export edge function and DATABASE_URL secret. Deploy the function and configure secrets in Supabase Dashboard.
          </Text>
          <Pressable onPress={() => setEdgeWarning(false)}>
            <Text style={styles.dismiss}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      <SettingsSection title="Backup Configuration">
        <SettingsRow label="Enable Automatic Backups" value={form.autoBackup} onValueChange={(v) => set('autoBackup', v)} />
        <SettingsSelect label="Backup Frequency" value={form.backupFrequency ?? 'daily'} options={FREQUENCY_OPTIONS} onSelect={(v) => set('backupFrequency', v as AppSettings['backupFrequency'])} />
        <SettingsSelect label="Backup Location" value={form.backupLocation ?? 'cloud'} options={LOCATION_OPTIONS} onSelect={(v) => set('backupLocation', v as AppSettings['backupLocation'])} />
        <SettingsSlider label="Retention Period" value={form.backupRetentionDays ?? 30} minimumValue={7} maximumValue={90} unit=" days" onValueChange={(v) => set('backupRetentionDays', v)} />
        <SettingsRow label="Enable Encryption" value={form.backupEncryption} onValueChange={(v) => set('backupEncryption', v)} />
        <SettingsRow label="Enable Compression" value={form.backupCompression} onValueChange={(v) => set('backupCompression', v)} />
        <SaveButton label="Save Backup Settings" onPress={handleSave} loading={saving} />
      </SettingsSection>

      <SettingsSection title="Manual Backup & Export">
        <Button label={backingUp ? 'Creating…' : 'Create Backup Now'} onPress={onCreateBackup} disabled={backingUp} />
        <ExportButton label="Export Users (.xlsx)" format="csv" onExport={() => runExport('export_users')} />
        <ExportButton label="Export Officers (.xlsx)" format="csv" onExport={() => runExport('export_officers')} />
        <ExportButton label="Export Reports (.xlsx)" format="csv" onExport={() => runExport('export_reports')} />
        <ExportButton label="Export Transactions (.xlsx)" format="csv" onExport={() => runExport('export_transactions')} />
        <ExportButton label="Export full workbook (.xlsx)" format="csv" onExport={() => runExport('export_workbook')} />
      </SettingsSection>

      <SettingsSection title="SQL Backup History" actionLabel="Refresh" onAction={() => refetchBackups()}>
        {(backups ?? []).length === 0 ? (
          <Text style={styles.empty}>No backup files yet.</Text>
        ) : (
          (backups ?? []).map((file) => (
            <View key={file.id} style={styles.backupRow}>
              <View style={styles.backupMeta}>
                <Text style={styles.backupName}>{file.filename}</Text>
                <Text style={styles.backupSub}>{file.sizeKb} KB · {file.type}</Text>
              </View>
              <Pressable
                onPress={() => {
                  Alert.alert('Delete backup?', file.filename, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await deleteBackup({ backupId: file.id }).unwrap();
                          refetchBackups();
                        } catch (e) {
                          dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: queryErrorMessage(e) }));
                        }
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.delete}>Delete</Text>
              </Pressable>
            </View>
          ))
        )}
      </SettingsSection>
    </>
  );

  return (
    <RoleGuard requiredPermission="settings.view">
      <Screen style={adminScreenStyles.canvas}>
        <SettingsHubLayout activeRoute="BackupExport">
          <ScrollView contentContainerStyle={styles.content}>{body}</ScrollView>
        </SettingsHubLayout>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  banner: {
    backgroundColor: adminColors.badgeWarning + '22',
    borderWidth: 1,
    borderColor: adminColors.badgeWarning,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  bannerText: { fontSize: 13, color: colors.textPrimary },
  dismiss: { marginTop: spacing.xs, color: adminColors.primary, fontWeight: '600' },
  empty: { color: colors.textSecondary, paddingVertical: spacing.md },
  backupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderDefault,
  },
  backupMeta: { flex: 1 },
  backupName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  backupSub: { fontSize: 12, color: colors.textSecondary },
  delete: { color: adminColors.deleteIcon, fontWeight: '600' },
});

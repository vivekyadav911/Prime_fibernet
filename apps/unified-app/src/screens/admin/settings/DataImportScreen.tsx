import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { AdminButton, AdminScreenLayout, FilterChips, RoleGuard, SectionCard } from '@/components/admin';
import { SettingsHubLayout } from '@/components/admin/settings';
import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import {
  useCommitExcelImportMutation,
  useGetImportHistoryQuery,
  useStageExcelImportMutation,
  type ImportCommitResult,
  type ImportPreviewRow,
  type ImportStageResult,
} from '@/services/api/adminImportApi';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminColors } from '@/theme/admin';
import { adminDesign } from '@/theme/adminDesign';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import {
  downloadImportTemplate,
  IMPORT_ENTITY_LABELS,
  type ImportEntityType,
} from '@/utils/importTemplates';
import { queryErrorMessage } from '@/utils/queryError';

type Tab = 'import' | 'history';

const ENTITY_OPTIONS: { id: ImportEntityType; label: string }[] = [
  { id: 'users', label: 'Users' },
  { id: 'plans', label: 'Plans' },
  { id: 'officers', label: 'Officers' },
  { id: 'transactions', label: 'Transactions' },
];

function formatDiff(diff: ImportPreviewRow['diff']): string {
  if (!diff) return '';
  return Object.entries(diff)
    .map(([field, change]) => `${field}: ${String(change.old ?? '—')} → ${String(change.new ?? '—')}`)
    .join('\n');
}

export function DataImportScreen() {
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<Tab>('import');
  const [entity, setEntity] = useState<ImportEntityType>('users');
  const [preview, setPreview] = useState<ImportStageResult | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [commitResult, setCommitResult] = useState<ImportCommitResult | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);

  const [stageImport, { isLoading: staging }] = useStageExcelImportMutation();
  const [commitImport, { isLoading: committing }] = useCommitExcelImportMutation();
  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
    error: historyErr,
    refetch: refetchHistory,
  } = useGetImportHistoryQuery(undefined, { skip: tab !== 'history' });

  const actionableCount = useMemo(() => {
    if (!preview) return 0;
    return preview.counts.insert + preview.counts.update;
  }, [preview]);

  const pickAndStage = async () => {
    setCommitResult(null);
    setStageError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/octet-stream',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      let fileBlob: Blob | undefined;
      if (Platform.OS === 'web' && asset.file) {
        fileBlob = asset.file;
      }

      const staged = await stageImport({
        entityType: entity,
        fileUri: asset.uri,
        fileName: asset.name ?? `${entity}_import.xlsx`,
        fileBlob,
      }).unwrap();

      setPreview(staged);
      setExpandedRow(null);
      setStageError(null);
      dispatch(
        enqueueToast({
          id: Date.now().toString(),
          type: 'success',
          message: `Preview ready — ${staged.counts.insert} insert, ${staged.counts.update} update, ${staged.counts.error} error`,
        }),
      );
    } catch (e) {
      const msg = queryErrorMessage(e);
      setPreview(null);
      setStageError(msg);
      dispatch(
        enqueueToast({
          id: Date.now().toString(),
          type: 'error',
          message: msg,
        }),
      );
    }
  };

  const onConfirm = async () => {
    if (!preview?.batch_id) return;
    try {
      const result = await commitImport({ batchId: preview.batch_id }).unwrap();
      setCommitResult(result);
      setPreview(null);
      dispatch(
        enqueueToast({
          id: Date.now().toString(),
          type: 'success',
          message: `Import committed — ${result.rows_inserted} inserted, ${result.rows_updated} updated`,
        }),
      );
    } catch (e) {
      dispatch(
        enqueueToast({
          id: Date.now().toString(),
          type: 'error',
          message: queryErrorMessage(e),
        }),
      );
    }
  };

  const onDownloadTemplate = async () => {
    try {
      await downloadImportTemplate(entity);
    } catch (e) {
      dispatch(
        enqueueToast({
          id: Date.now().toString(),
          type: 'error',
          message: queryErrorMessage(e),
        }),
      );
    }
  };

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminScreenLayout scroll>
        <SettingsHubLayout activeRoute="DataImport">
          <Text style={styles.title}>Data Import</Text>
          <Text style={styles.subtitle}>
            Diff-based Excel import with preview. Nothing is written until you confirm.
          </Text>

          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tab, tab === 'import' && styles.tabActive]}
              onPress={() => setTab('import')}
            >
              <Text style={[styles.tabText, tab === 'import' && styles.tabTextActive]}>Import</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, tab === 'history' && styles.tabActive]}
              onPress={() => setTab('history')}
            >
              <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>History</Text>
            </Pressable>
          </View>

          {tab === 'import' ? (
            <>
              <SectionCard title="Entity">
                <FilterChips
                  options={ENTITY_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                  selected={entity}
                  onSelect={(v) => {
                    setEntity(v);
                    setPreview(null);
                    setCommitResult(null);
                    setStageError(null);
                  }}
                />
                <Text style={styles.hint}>
                  Match key:{' '}
                  {entity === 'users'
                    ? 'email'
                    : entity === 'plans'
                      ? 'name'
                      : entity === 'officers'
                        ? 'employee_id'
                        : 'payment_number'}
                  {entity === 'officers' || entity === 'transactions'
                    ? ' · unmatched rows are flagged (no insert)'
                    : ' · unmatched rows will be inserted'}
                </Text>
                <View style={styles.actions}>
                  <AdminButton label="Download template" variant="secondary" onPress={onDownloadTemplate} />
                  <AdminButton
                    label={staging ? 'Parsing…' : 'Upload Excel'}
                    onPress={pickAndStage}
                    disabled={staging || committing}
                  />
                </View>
                {staging ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator color={adminColors.primary} />
                    <Text style={styles.loadingText}>Parsing and staging rows…</Text>
                  </View>
                ) : null}
                {stageError ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorTitle}>Import failed</Text>
                    <Text style={styles.errorText}>{stageError}</Text>
                  </View>
                ) : null}
              </SectionCard>

              {commitResult ? (
                <SectionCard title="Import complete">
                  <Text style={styles.resultLine}>
                    Inserted {commitResult.rows_inserted} · Updated {commitResult.rows_updated} ·
                    Unchanged {commitResult.rows_unchanged} · Errors {commitResult.rows_errored}
                  </Text>
                  <Text style={styles.hint}>History id: {commitResult.history_id}</Text>
                  <AdminButton label="View history" variant="secondary" onPress={() => setTab('history')} />
                </SectionCard>
              ) : null}

              {preview ? (
                <SectionCard title="Preview — review before confirm">
                  <View style={styles.countRow}>
                    <CountChip label="Insert" value={preview.counts.insert} tone="ok" />
                    <CountChip label="Update" value={preview.counts.update} tone="warn" />
                    <CountChip label="Unchanged" value={preview.counts.unchanged} tone="muted" />
                    <CountChip label="Errors" value={preview.counts.error} tone="err" />
                  </View>

                  <FlatList
                    data={preview.rows.filter((r) => r.action !== 'unchanged')}
                    keyExtractor={(item) => `${item.row_number}-${item.action}`}
                    scrollEnabled={false}
                    ListEmptyComponent={
                      <EmptyState
                        title="Nothing to apply"
                        subtitle="All rows match existing data with no changes."
                      />
                    }
                    renderItem={({ item }) => (
                      <Pressable
                        style={styles.rowCard}
                        onPress={() =>
                          setExpandedRow((cur) => (cur === item.row_number ? null : item.row_number))
                        }
                      >
                        <View style={styles.rowHeader}>
                          <Text style={styles.rowTitle}>
                            Row {item.row_number} · {item.action.toUpperCase()}
                          </Text>
                          <Text style={styles.rowKey}>{item.match_key ?? '—'}</Text>
                        </View>
                        {item.error_message ? (
                          <Text style={styles.errorText}>{item.error_message}</Text>
                        ) : null}
                        {expandedRow === item.row_number && item.diff ? (
                          <Text style={styles.diffText}>{formatDiff(item.diff)}</Text>
                        ) : null}
                        {item.action === 'update' && expandedRow !== item.row_number ? (
                          <Text style={styles.hint}>
                            {Object.keys(item.diff ?? {}).length} field(s) will change — tap to expand
                          </Text>
                        ) : null}
                      </Pressable>
                    )}
                  />

                  <View style={styles.actions}>
                    <AdminButton
                      label="Cancel"
                      variant="secondary"
                      onPress={() => setPreview(null)}
                      disabled={committing}
                    />
                    <AdminButton
                      label={committing ? 'Committing…' : 'Confirm import'}
                      onPress={onConfirm}
                      disabled={committing || actionableCount === 0}
                    />
                  </View>
                  {actionableCount === 0 ? (
                    <Text style={styles.hint}>No insert/update rows to commit.</Text>
                  ) : null}
                </SectionCard>
              ) : null}
            </>
          ) : (
            <SectionCard title="Import history">
              {historyLoading ? <SkeletonLoader rows={4} shape="card" /> : null}
              {historyError ? (
                <ErrorState message={queryErrorMessage(historyErr)} onRetry={refetchHistory} />
              ) : null}
              {!historyLoading && !historyError && !(history ?? []).length ? (
                <EmptyState
                  title="No imports yet"
                  subtitle="Committed Excel imports will appear here for audit."
                />
              ) : null}
              {(history ?? []).map((h) => (
                <View key={h.id} style={styles.historyCard}>
                  <Text style={styles.rowTitle}>
                    {IMPORT_ENTITY_LABELS[h.entity_type as ImportEntityType] ?? h.entity_type} ·{' '}
                    {h.file_name ?? 'file'}
                  </Text>
                  <Text style={styles.hint}>
                    {new Date(h.created_at).toLocaleString()} · {h.admin_name ?? 'Admin'}
                  </Text>
                  <Text style={styles.resultLine}>
                    +{h.rows_inserted} / ~{h.rows_updated} / ={h.rows_unchanged} / !{h.rows_errored}
                  </Text>
                </View>
              ))}
            </SectionCard>
          )}
        </SettingsHubLayout>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

function CountChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'ok' | 'warn' | 'muted' | 'err';
}) {
  const bg =
    tone === 'ok'
      ? colors.successGreen
      : tone === 'warn'
        ? colors.warningAmber
        : tone === 'err'
          ? colors.errorRed
          : colors.borderDefault;
  return (
    <View style={[styles.countChip, { borderColor: bg }]}>
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    ...adminDesign.typography.pageTitle,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: adminColors.cardBg,
  },
  tabActive: {
    borderColor: adminColors.primary,
    backgroundColor: adminColors.primary,
  },
  tabText: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: colors.white },
  hint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  loadingText: { color: colors.textSecondary, fontSize: 13 },
  errorBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.errorRed,
    backgroundColor: adminColors.cardBg,
  },
  errorTitle: {
    color: colors.errorRed,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  countRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  countChip: {
    minWidth: 72,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: adminColors.cardBg,
    alignItems: 'center',
  },
  countValue: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  countLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  rowCard: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: adminColors.cardBg,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowTitle: { fontWeight: '700', color: colors.textPrimary, fontSize: 13, flex: 1 },
  rowKey: { color: colors.textSecondary, fontSize: 12 },
  errorText: { color: colors.errorRed, fontSize: 12, marginTop: spacing.xs },
  diffText: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  resultLine: { color: colors.textPrimary, fontSize: 13, marginBottom: spacing.xs },
  historyCard: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    paddingVertical: spacing.sm,
  },
});

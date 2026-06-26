import { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';


import { AdminScreenLayout, DateRangePicker, ExportButton, RoleGuard, SearchBar, StatusBadge } from '@/components/admin';
import { SaveButton, SettingsHubLayout, SettingsSelect, SettingsSection } from '@/components/admin/settings';
import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import {
  useGetAuditLogUsersQuery,
  useGetAuditLogsFilteredQuery,
} from '@/store/api/endpoints';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AuditLogEntry } from '@/types/settings';
import { auditLogsToCsv, shareBlob } from '@/utils/shareFile';
import { queryErrorMessage } from '@/utils/queryError';

const ACTION_OPTIONS = [
  { value: 'All', label: 'All Actions' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'LOGIN', label: 'LOGIN' },
  { value: 'EXPORT', label: 'EXPORT' },
  { value: 'BACKUP', label: 'BACKUP' },
];

const CATEGORY_OPTIONS = [
  { value: 'All', label: 'All Categories' },
  { value: 'settings', label: 'settings' },
  { value: 'officer', label: 'officer' },
  { value: 'invoice', label: 'invoice' },
  { value: 'user', label: 'user' },
  { value: 'backup', label: 'backup' },
  { value: 'security', label: 'security' },
];

export function AuditLogsScreen() {
  const [actionType, setActionType] = useState('All');
  const [category, setCategory] = useState('All');
  const [userId, setUserId] = useState('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [applied, setApplied] = useState({
    actionType: 'All',
    category: 'All',
    userId: 'all',
    search: '',
    startDate: '',
    endDate: '',
  });

  const { data: users } = useGetAuditLogUsersQuery();
  const { data, isLoading, isError, error, refetch } = useGetAuditLogsFilteredQuery(applied);

  const userOptions = useMemo(
    () => [{ value: 'all', label: 'All Users' }, ...(users ?? []).map((u) => ({ value: u.id, label: u.label }))],
    [users],
  );

  const onSearch = () => {
    setApplied({ actionType, category, userId, search, startDate, endDate });
  };

  const exportCsv = async () => {
    const rows = data ?? [];
    const csv = auditLogsToCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    await shareBlob(blob, `audit_logs_${Date.now()}.csv`);
  };

  const renderItem = useCallback(
    ({ item }: { item: AuditLogEntry }) => (
      <View style={styles.row}>
        <Text style={styles.time}>{format(new Date(item.timestamp), 'dd MMM yyyy HH:mm')}</Text>
        <Text style={styles.desc}>{item.description ?? item.action}</Text>
        <View style={styles.badges}>
          <StatusBadge status={item.action.toLowerCase()} />
          {item.category ? <StatusBadge status={item.category} /> : null}
        </View>
      </View>
    ),
    [],
  );

  const listBody = isLoading ? (
    <SkeletonLoader rows={6} />
  ) : isError ? (
    <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
  ) : !data?.length ? (
    <EmptyState title="No audit records" subtitle="No audit records in this date range." icon="📋" />
  ) : (
    <FlatList data={data} keyExtractor={(item) => item.id} renderItem={renderItem} scrollEnabled={false} />
  );

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminScreenLayout>
        <SettingsHubLayout activeRoute="AuditLogs">
          <ScrollView contentContainerStyle={styles.content}>
            <SettingsSection title="Filters">
              <SettingsSelect label="Action Type" value={actionType} options={ACTION_OPTIONS} onSelect={setActionType} />
              <SettingsSelect label="User" value={userId} options={userOptions} onSelect={setUserId} />
              <SettingsSelect label="Category" value={category} options={CATEGORY_OPTIONS} onSelect={setCategory} />
              <SearchBar value={search} onChangeText={setSearch} placeholder="Search description or action" />
              <DateRangePicker
                from={startDate}
                to={endDate}
                onFromChange={setStartDate}
                onToChange={setEndDate}
              />
              <SaveButton label="Search" onPress={onSearch} />
              <ExportButton label="Export CSV" format="csv" onExport={exportCsv} />
            </SettingsSection>

            <SettingsSection title="Activity Logs">{listBody}</SettingsSection>
          </ScrollView>
        </SettingsHubLayout>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  row: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderDefault,
  },
  time: { fontSize: 12, color: colors.textSecondary },
  desc: { fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginVertical: 4 },
  badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
});

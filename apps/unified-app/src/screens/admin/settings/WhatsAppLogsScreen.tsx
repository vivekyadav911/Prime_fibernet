import { useCallback, useMemo, useState } from 'react';
import { FlatList, ListRenderItem, StyleSheet, Text, View } from 'react-native';

import { AdminScreenLayout, FilterChips, RoleGuard, SectionCard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  useGetWhatsAppLogsQuery,
  type WhatsAppLog,
} from '@/services/api/whatsappApi';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'payment_receipt', label: 'Payments' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'complaint_update', label: 'Complaints' },
  { value: 'activation', label: 'Activations' },
] as const;

function messageTypeLabel(type: WhatsAppLog['messageType']): string {
  switch (type) {
    case 'payment_receipt':
      return 'Payment receipt';
    case 'invoice':
      return 'Invoice';
    case 'complaint_update':
      return 'Complaint update';
    case 'activation':
      return 'Activation';
    default:
      return 'Manual';
  }
}

function statusStyle(status: WhatsAppLog['status']) {
  switch (status) {
    case 'sent':
      return [styles.statusBadge, styles.statusSent, styles.statusBadgeTextSent] as const;
    case 'failed':
      return [styles.statusBadge, styles.statusFailed, styles.statusBadgeTextFailed] as const;
    case 'skipped':
      return [styles.statusBadge, styles.statusSkipped, styles.statusBadgeTextSkipped] as const;
    default:
      return [styles.statusBadge, styles.statusPending, styles.statusBadgeTextPending] as const;
  }
}

export function WhatsAppLogsScreen() {
  const [messageType, setMessageType] =
    useState<(typeof FILTER_OPTIONS)[number]['value']>('all');
  const logsQuery = useGetWhatsAppLogsQuery({ limit: 100, messageType });

  const data = logsQuery.data ?? [];

  const renderItem = useCallback<ListRenderItem<WhatsAppLog>>(({ item }) => {
    const [badgeStyle, badgeBackgroundStyle, badgeTextStyle] = statusStyle(item.status);
    return (
      <View style={styles.logCard}>
        <View style={styles.logHeader}>
          <Text style={styles.logType}>{messageTypeLabel(item.messageType)}</Text>
          <View style={[badgeStyle, badgeBackgroundStyle]}>
            <Text style={[styles.statusBadgeText, badgeTextStyle]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.recipientName}>{item.recipientName ?? item.recipientPhone}</Text>
        {item.recipientName ? <Text style={styles.recipientPhone}>{item.recipientPhone}</Text> : null}
        {item.referenceType || item.referenceId ? (
          <Text style={styles.metaText}>
            Ref: {item.referenceType ?? 'unknown'} {item.referenceId ? `(${item.referenceId.slice(0, 8)})` : ''}
          </Text>
        ) : null}
        {item.errorMessage ? <Text style={styles.errorText}>{item.errorMessage}</Text> : null}
        <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleString('en-IN')}</Text>
      </View>
    );
  }, []);

  const emptyState = useMemo(() => {
    return (
      <SectionCard title="No Logs Yet">
        <Text style={styles.emptyTitle}>No WhatsApp messages found for this filter.</Text>
        <Text style={styles.emptyBody}>
          Send a payment receipt, invoice, complaint update, or activation message to populate the audit trail.
        </Text>
      </SectionCard>
    );
  }, []);

  if (logsQuery.isLoading) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={8} />
      </AdminScreenLayout>
    );
  }

  if (logsQuery.isError) {
    return (
      <AdminScreenLayout>
        <ErrorState message={queryErrorMessage(logsQuery.error)} onRetry={logsQuery.refetch} />
      </AdminScreenLayout>
    );
  }

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminScreenLayout>
        <View style={styles.container}>
          <FilterChips
            options={FILTER_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            selected={messageType}
            onSelect={(value) => setMessageType(value as (typeof FILTER_OPTIONS)[number]['value'])}
          />
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={emptyState}
            refreshing={logsQuery.isFetching}
            onRefresh={() => void logsQuery.refetch()}
          />
        </View>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: spacing.sm,
  },
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  logCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logType: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recipientName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  recipientPhone: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 12,
    color: colors.errorRed,
    marginTop: spacing.xxs,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusSent: {
    backgroundColor: adminColors.navPillSuccessBg,
  },
  statusBadgeTextSent: {
    color: adminColors.navPillSuccessText,
  },
  statusFailed: {
    backgroundColor: adminColors.navPillDangerBg,
  },
  statusBadgeTextFailed: {
    color: adminColors.navPillDangerText,
  },
  statusSkipped: {
    backgroundColor: colors.borderDefault,
  },
  statusBadgeTextSkipped: {
    color: colors.textSecondary,
  },
  statusPending: {
    backgroundColor: adminColors.navPillWarningBg,
  },
  statusBadgeTextPending: {
    color: adminColors.navPillWarningText,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});

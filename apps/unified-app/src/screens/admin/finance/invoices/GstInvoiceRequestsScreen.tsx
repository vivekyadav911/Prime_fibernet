import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AdminScreenLayout, FilterChips, RoleGuard } from '@/components/admin';
import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import {
  useGetGstInvoiceRequestsQuery,
  useUpdateGstInvoiceRequestMutation,
  type GstInvoiceRequestRecord,
  type GstInvoiceRequestStatus,
} from '@/services/api/adminFinanceApi';
import type { AdminInvoicesStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminDesign } from '@/theme/adminDesign';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { formatINR } from '@/utils/currencyFormat';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminInvoicesStackParamList, 'GstInvoiceRequests'>;

type StatusFilter = GstInvoiceRequestStatus | 'all';

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'issued', label: 'Issued' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_LABELS: Record<GstInvoiceRequestStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  issued: 'Issued',
  rejected: 'Rejected',
};

function statusColor(status: GstInvoiceRequestStatus): string {
  if (status === 'issued') return adminColors.chipTones.success.text;
  if (status === 'rejected') return colors.errorRed;
  if (status === 'processing') return adminColors.primary;
  return colors.textSecondary;
}

export function GstInvoiceRequestsScreen(_props: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [selected, setSelected] = useState<GstInvoiceRequestRecord | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data, isLoading, isError, error, refetch, isFetching } = useGetGstInvoiceRequestsQuery({
    status: statusFilter,
  });
  const [updateRequest, { isLoading: updating }] = useUpdateGstInvoiceRequestMutation();

  const openDetail = useCallback((item: GstInvoiceRequestRecord) => {
    setSelected(item);
    setAdminNotes(item.adminNotes ?? '');
  }, []);

  const closeDetail = useCallback(() => {
    setSelected(null);
    setAdminNotes('');
  }, []);

  const applyStatus = useCallback(
    async (status: GstInvoiceRequestStatus) => {
      if (!selected) return;
      try {
        await updateRequest({
          id: selected.id,
          status,
          adminNotes: adminNotes.trim() || undefined,
        }).unwrap();
        Alert.alert(
          'Updated',
          status === 'issued'
            ? 'GST invoice request marked as issued.'
            : status === 'rejected'
              ? 'GST invoice request rejected.'
              : 'Request status updated.',
        );
        closeDetail();
      } catch (e) {
        Alert.alert('Update failed', queryErrorMessage(e));
      }
    },
    [adminNotes, closeDetail, selected, updateRequest],
  );

  const renderItem = useCallback(
    ({ item }: { item: GstInvoiceRequestRecord }) => (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => openDetail(item)}
      >
        <View style={styles.rowTop}>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={[styles.statusPill, { color: statusColor(item.status) }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
        <Text style={styles.meta}>GSTIN: {item.gstin}</Text>
        <Text style={styles.meta}>
          Payment: {item.paymentNumber ?? item.paymentId.slice(0, 8)} ·{' '}
          {item.paymentAmount != null ? formatINR(item.paymentAmount) : '—'}
        </Text>
        <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('en-IN')}</Text>
      </Pressable>
    ),
    [openDetail],
  );

  const listHeader = useMemo(
    () => (
      <View style={adminScreenStyles.listHeader}>
        <Text style={styles.heading}>Customer GST invoice requests</Text>
        <Text style={styles.subheading}>
          Review requests submitted from the customer app after a confirmed payment.
        </Text>
        <FilterChips options={STATUS_FILTERS} selected={statusFilter} onSelect={setStatusFilter} />
      </View>
    ),
    [statusFilter],
  );

  if (isLoading && !data) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={8} />
      </AdminScreenLayout>
    );
  }

  if (isError) {
    return (
      <AdminScreenLayout>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </AdminScreenLayout>
    );
  }

  return (
    <RoleGuard requiredPermission="invoices.view">
      <AdminScreenLayout>
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <EmptyState
              title="No GST requests"
              subtitle={
                statusFilter === 'pending'
                  ? 'Customer GST invoice requests will appear here.'
                  : 'No requests match this filter.'
              }
              icon="🧾"
            />
          }
          refreshing={isFetching}
          onRefresh={refetch}
          contentContainerStyle={adminScreenStyles.listContent}
        />

        <Modal visible={selected != null} animationType="slide" transparent onRequestClose={closeDetail}>
          <Pressable style={styles.backdrop} onPress={closeDetail} />
          <View style={styles.sheet}>
            {selected ? (
              <>
                <Text style={styles.sheetTitle}>GST request</Text>
                <Text style={styles.sheetLine}>Customer: {selected.customerName}</Text>
                <Text style={styles.sheetLine}>Account: {selected.customerAccountId ?? '—'}</Text>
                <Text style={styles.sheetLine}>GSTIN: {selected.gstin}</Text>
                <Text style={styles.sheetLine}>Business: {selected.businessName ?? '—'}</Text>
                <Text style={styles.sheetLine}>Address: {selected.billingAddress ?? '—'}</Text>
                <Text style={styles.sheetLine}>
                  Payment: {selected.paymentNumber ?? selected.paymentId} ·{' '}
                  {selected.paymentAmount != null ? formatINR(selected.paymentAmount) : '—'}
                </Text>

                <Text style={styles.notesLabel}>Admin notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  placeholder="Internal notes for processing"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />

                <View style={styles.actions}>
                  <Pressable
                    style={[styles.actionBtn, styles.actionPrimary]}
                    onPress={() => void applyStatus('issued')}
                    disabled={updating}
                  >
                    <Text style={styles.actionPrimaryText}>Mark issued</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.actionSecondary]}
                    onPress={() => void applyStatus('processing')}
                    disabled={updating}
                  >
                    <Text style={styles.actionSecondaryText}>Mark processing</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.actionDanger]}
                    onPress={() => void applyStatus('rejected')}
                    disabled={updating}
                  >
                    <Text style={styles.actionDangerText}>Reject</Text>
                  </Pressable>
                </View>
                <Pressable onPress={closeDetail} style={styles.closeBtn}>
                  <Text style={styles.closeText}>Close</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </Modal>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subheading: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  row: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: adminDesign.radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  rowPressed: {
    opacity: 0.9,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  statusPill: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: adminDesign.radius.card,
    borderTopRightRadius: adminDesign.radius.card,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sheetLine: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: adminDesign.radius.input,
    padding: spacing.sm,
    minHeight: 80,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceWhite,
    textAlignVertical: 'top',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionBtn: {
    minHeight: adminDesign.button.minHeight,
    borderRadius: adminDesign.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  actionPrimary: {
    backgroundColor: adminColors.primary,
  },
  actionPrimaryText: {
    color: colors.surfaceWhite,
    fontWeight: '600',
    fontSize: 15,
  },
  actionSecondary: {
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: adminColors.primary,
  },
  actionSecondaryText: {
    color: adminColors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  actionDanger: {
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: colors.errorRed,
  },
  actionDangerText: {
    color: colors.errorRed,
    fontWeight: '600',
    fontSize: 15,
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  closeText: {
    color: adminColors.primary,
    fontWeight: '600',
  },
});

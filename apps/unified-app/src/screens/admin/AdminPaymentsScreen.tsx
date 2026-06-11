import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PaymentStatus } from '@prime/types';
import { Button, Screen } from '@prime/ui';

import { DateRangePicker } from '@/components/admin';
import { EmptyState, ErrorState, SkeletonLoader, StatusChip } from '@/components/common';
import type { PaymentLedgerEntry } from '@/services/api/paymentsApi';
import {
  useGetAllPaymentsQuery,
  useRefundMutation,
} from '@/store/api/endpoints';
import type { AdminStackParamList } from '@/types/navigation';
import { queryErrorMessage } from '@/utils/queryError';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type StatusFilter = PaymentStatus | 'all';
type MethodFilter = 'all' | 'cash' | 'upi' | 'credit_card' | 'razorpay' | 'easybuzz';

export function AdminPaymentsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [refundTarget, setRefundTarget] = useState<PaymentLedgerEntry | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [fullRefund, setFullRefund] = useState(true);

  const { data, isLoading, isError, error, refetch } = useGetAllPaymentsQuery({
    search,
    status: statusFilter,
    method: methodFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const [refundPayment, { isLoading: refunding }] = useRefundMutation();

  const rows = useMemo(() => data ?? [], [data]);
  const canRefund = refundReason.trim().length >= 20;

  const openRefund = useCallback((entry: PaymentLedgerEntry) => {
    setRefundTarget(entry);
    setRefundAmount(String(entry.amount));
    setRefundReason('');
    setFullRefund(true);
  }, []);

  const submitRefund = useCallback(async () => {
    if (!refundTarget || !canRefund) return;
    const amount = fullRefund ? refundTarget.amount : Number(refundAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid refund amount.');
      return;
    }
    try {
      await refundPayment({
        paymentId: refundTarget.id,
        amount,
        reason: refundReason.trim(),
      }).unwrap();
      setRefundTarget(null);
      refetch();
      Alert.alert('Refund issued', 'Payment refund has been submitted.');
    } catch (e) {
      Alert.alert('Refund failed', e instanceof Error ? e.message : 'Could not process refund');
    }
  }, [canRefund, fullRefund, refundAmount, refundPayment, refundReason, refundTarget, refetch]);

  const keyExtractor = useCallback((item: PaymentLedgerEntry) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: PaymentLedgerEntry }) => (
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <Text style={styles.userName}>{item.userName}</Text>
          <Text style={styles.meta}>
            {item.planName ?? '—'} · {item.paymentMethod} · {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.amount}>₹{item.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.rowActions}>
          <StatusChip status={item.paymentStatus} />
          <Button
            label="Invoice"
            variant="ghost"
            onPress={() => navigation.navigate('PaymentDetail', { paymentId: item.id })}
          />
          {item.paymentStatus === 'success' ? (
            <Button label="Refund" variant="secondary" onPress={() => openRefund(item)} />
          ) : null}
        </View>
      </View>
    ),
    [navigation, openRefund],
  );

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={8} rowHeight={72} shape="card" />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <TextInput
        style={styles.search}
        placeholder="Search user, plan, or payment ID…"
        value={search}
        onChangeText={setSearch}
      />
      <View style={styles.filterRow}>
        {(['all', 'success', 'pending', 'failed', 'refunded'] as StatusFilter[]).map((s) => (
          <Pressable
            key={s}
            style={[styles.chip, statusFilter === s && styles.chipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>{s}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.filterRow}>
        {(['all', 'cash', 'upi', 'credit_card', 'razorpay', 'easybuzz'] as MethodFilter[]).map((m) => (
          <Pressable
            key={m}
            style={[styles.chip, methodFilter === m && styles.chipActive]}
            onPress={() => setMethodFilter(m)}
          >
            <Text style={[styles.chipText, methodFilter === m && styles.chipTextActive]}>{m}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.dateRow}>
        <DateRangePicker
          from={startDate}
          to={endDate}
          onFromChange={setStartDate}
          onToChange={setEndDate}
          fromLabel="Start"
          toLabel="End"
        />
      </View>

      {!rows.length ? (
        <EmptyState title="No payments found" subtitle="Adjust filters or check back later" icon="💳" />
      ) : (
        <FlatList data={rows} keyExtractor={keyExtractor} renderItem={renderItem} />
      )}

      <Modal visible={!!refundTarget} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Issue refund</Text>
            <Text style={styles.modalMeta}>
              {refundTarget?.userName} · ₹{refundTarget?.amount.toFixed(2)}
            </Text>
            <View style={styles.refundTypeRow}>
              <Pressable
                style={[styles.chip, fullRefund && styles.chipActive]}
                onPress={() => {
                  setFullRefund(true);
                  if (refundTarget) setRefundAmount(String(refundTarget.amount));
                }}
              >
                <Text style={[styles.chipText, fullRefund && styles.chipTextActive]}>Full</Text>
              </Pressable>
              <Pressable style={[styles.chip, !fullRefund && styles.chipActive]} onPress={() => setFullRefund(false)}>
                <Text style={[styles.chipText, !fullRefund && styles.chipTextActive]}>Partial</Text>
              </Pressable>
            </View>
            {!fullRefund ? (
              <TextInput
                style={styles.input}
                placeholder="Refund amount"
                keyboardType="decimal-pad"
                value={refundAmount}
                onChangeText={setRefundAmount}
              />
            ) : null}
            <TextInput
              style={[styles.input, styles.reasonInput]}
              placeholder="Reason (min 20 characters)"
              multiline
              value={refundReason}
              onChangeText={setRefundReason}
            />
            <Button
              label={refunding ? 'Processing…' : 'Confirm refund'}
              onPress={() => void submitRefund()}
              disabled={!canRefund}
            />
            <Button label="Cancel" variant="ghost" onPress={() => setRefundTarget(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    margin: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.sm, marginBottom: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  chipActive: { borderColor: colors.accentTeal, backgroundColor: `${colors.accentTeal}18` },
  chipText: { color: colors.textSecondary, fontSize: 12, textTransform: 'capitalize' },
  chipTextActive: { color: colors.accentTeal, fontWeight: '600' },
  dateRow: { paddingHorizontal: spacing.sm, marginBottom: spacing.sm },
  row: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.sm,
  },
  rowMain: { gap: spacing.xxs },
  userName: { fontWeight: '700', color: colors.textPrimary },
  meta: { color: colors.textSecondary, fontSize: 12 },
  amount: { fontSize: 16, fontWeight: '700', color: colors.primaryNavy },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.primaryNavy },
  modalMeta: { color: colors.textSecondary },
  refundTypeRow: { flexDirection: 'row', gap: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
  },
  reasonInput: { minHeight: 88, textAlignVertical: 'top' },
});

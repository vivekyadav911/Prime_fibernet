import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, Share, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Payment } from '@prime/types';
import { Screen } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader, StatusChip } from '@/components/common';
import { useAppSelector } from '@/store/hooks';
import { useGetPaymentHistoryQuery, useLazyGetInvoiceUrlQuery } from '@/store/api/endpoints';
import type { CustomerStackParamList } from '@/types/navigation';
import { queryErrorMessage } from '@/utils/queryError';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<CustomerStackParamList, 'MyBills'>;

type BillFilter = 'all' | 'paid' | 'pending';

type BillSection = {
  title: string;
  data: Payment[];
};

const FILTERS: { id: BillFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'paid', label: 'Paid' },
  { id: 'pending', label: 'Pending' },
];

function monthKey(dateIso: string): string {
  const d = new Date(dateIso);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function MyBillsScreen({ navigation }: Props) {
  const userId = useAppSelector((s) => s.auth.user?.id ?? '');
  const { data, isLoading, isError, error, refetch } = useGetPaymentHistoryQuery(userId, { skip: !userId });
  const [fetchInvoiceUrl] = useLazyGetInvoiceUrlQuery();
  const [filter, setFilter] = useState<BillFilter>('all');

  const filtered = useMemo(() => {
    const rows = data ?? [];
    if (filter === 'paid') return rows.filter((p) => p.paymentStatus === 'success');
    if (filter === 'pending') return rows.filter((p) => p.paymentStatus === 'pending');
    return rows;
  }, [data, filter]);

  const sections = useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const payment of filtered) {
      const key = monthKey(payment.createdAt);
      const list = map.get(key) ?? [];
      list.push(payment);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([title, sectionData]) => ({ title, data: sectionData }));
  }, [filtered]);

  const onDownload = useCallback(
    async (payment: Payment) => {
      try {
        const url = payment.invoiceUrl ?? (await fetchInvoiceUrl(payment.id).unwrap());
        if (!url) {
          Alert.alert('Invoice unavailable', 'Try again later.');
          return;
        }
        if (await Sharing.isAvailableAsync()) {
          const filename = `${FileSystem.cacheDirectory}invoice-${payment.id}.pdf`;
          const result = await FileSystem.downloadAsync(url, filename);
          await Sharing.shareAsync(result.uri);
        } else {
          await Share.share({ url, message: 'Your Prime Fibernet invoice' });
        }
      } catch {
        Alert.alert('Download failed', 'Could not fetch invoice.');
      }
    },
    [fetchInvoiceUrl],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: BillSection }) => <Text style={styles.sectionTitle}>{section.title}</Text>,
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: Payment }) => (
      <Pressable style={styles.row} onPress={() => navigation.navigate('Invoice', { invoiceId: item.id })}>
        <View style={styles.rowMain}>
          <Text style={styles.amount}>₹{item.amount.toFixed(2)}</Text>
          <StatusChip status={item.paymentStatus} />
        </View>
        <View style={styles.rowActions}>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          <Pressable onPress={() => void onDownload(item)} hitSlop={8}>
            <Text style={styles.download}>⬇</Text>
          </Pressable>
        </View>
      </Pressable>
    ),
    [navigation, onDownload],
  );

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={6} rowHeight={56} shape="card" />
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
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.id}
            style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {!sections.length ? (
        <EmptyState title="No bills yet" subtitle="Your invoices will appear here after payment" icon="🧾" />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: spacing.xs, padding: spacing.md },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterChipActive: { borderColor: colors.accentTeal, backgroundColor: `${colors.accentTeal}18` },
  filterText: { color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: colors.accentTeal },
  list: { paddingBottom: spacing.xl },
  sectionTitle: {
    fontWeight: '700',
    color: colors.primaryNavy,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  rowMain: { gap: spacing.xs },
  amount: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  date: { color: colors.textSecondary, fontSize: 12 },
  download: { fontSize: 18, color: colors.accentTeal },
});

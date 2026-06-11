import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { RoleGuard, SearchBar, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetAdminInvoicesQuery } from '@/store/api/endpoints';
import type { AdminInvoicesStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';
import { useState } from 'react';

type Props = NativeStackScreenProps<AdminInvoicesStackParamList, 'InvoiceHistory'>;

export function InvoiceHistoryScreen(_props: Props) {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error, refetch } = useGetAdminInvoicesQuery({});

  const filtered = (data ?? []).filter(
    (i) => !search || i.customerName.toLowerCase().includes(search.toLowerCase()) || i.invoiceNumber.includes(search),
  );

  if (isLoading) return <Screen><SkeletonLoader rows={8} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="invoices.view">
      <Screen padded={false}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search invoice or customer…" />
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.rowText}>
                {item.invoiceNumber} · {item.customerName} · ₹{item.totalAmount}
              </Text>
              <StatusBadge status={item.status} />
            </View>
          )}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  row: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowText: { fontSize: 13, flex: 1 },
});

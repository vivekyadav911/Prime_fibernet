import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { DateRangePicker, FilterChips, RoleGuard, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useDownloadInvoiceMutation, useGetAdminInvoicesQuery, useSendInvoiceMutation } from '@/store/api/endpoints';
import type { AdminInvoicesStackParamList } from '@/types/navigation';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminInvoicesStackParamList, 'InvoiceList'>;

export function InvoiceListScreen({ navigation }: Props) {
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, isLoading, isError, error, refetch } = useGetAdminInvoicesQuery({ status, from: from || undefined, to: to || undefined });
  const [download] = useDownloadInvoiceMutation();
  const [send] = useSendInvoiceMutation();

  const renderItem = useCallback(
    ({ item }: { item: NonNullable<typeof data>[number] }) => (
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.num}>{item.invoiceNumber}</Text>
          <Text style={styles.meta}>{item.customerName} · ₹{item.totalAmount} · {new Date(item.date).toLocaleDateString()}</Text>
          <StatusBadge status={item.status} />
        </View>
        <View style={styles.actions}>
          <Button label="PDF" variant="ghost" onPress={() => void download(item.id)} />
          <Button label="Email" variant="ghost" onPress={() => void send({ invoiceId: item.id, channel: 'email' })} />
          <Button label="WhatsApp" variant="ghost" onPress={() => void send({ invoiceId: item.id, channel: 'whatsapp' })} />
        </View>
      </View>
    ),
    [download, send],
  );

  if (isLoading) return <Screen style={adminScreenStyles.canvas}><SkeletonLoader rows={8} /></Screen>;
  if (isError) return <Screen style={adminScreenStyles.canvas}><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="invoices.view">
      <Screen padded={false} style={adminScreenStyles.canvas}>
        <View style={styles.toolbar}>
          <FilterChips
            options={[
              { value: 'all', label: 'All' },
              { value: 'paid', label: 'Paid' },
              { value: 'unpaid', label: 'Unpaid' },
              { value: 'overdue', label: 'Overdue' },
            ]}
            selected={status}
            onSelect={setStatus}
          />
          <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
          <Button label="History" variant="secondary" onPress={() => navigation.navigate('InvoiceHistory')} />
          <Button label="Manual GST" onPress={() => navigation.navigate('ManualGstInvoice')} />
        </View>
        <FlatList data={data ?? []} keyExtractor={(i) => i.id} renderItem={renderItem} />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  toolbar: { padding: spacing.sm, gap: spacing.sm },
  row: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: spacing.sm },
  info: { gap: spacing.xxs },
  num: { fontWeight: '700' },
  meta: { fontSize: 12, color: colors.textSecondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});

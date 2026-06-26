import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { AdminKPICard, FilterChips, RoleGuard, SearchBar } from '@/components/admin';
import { BulkDispatchCard, InvoiceListRow, SendInvoiceRecipientModal } from '@/components/invoices';
import type { SendInvoiceRecipientPayload } from '@/components/invoices';
import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import {
  useBulkSendInvoicesMutation,
  useGetAdminInvoicesQuery,
  useGetInvoiceStatsQuery,
  useLazyGetInvoiceByIdQuery,
  useSendInvoiceMutation,
} from '@/store/api/endpoints';
import { useInvoicePDF } from '@/hooks/useInvoicePDF';
import type { AdminInvoicesStackParamList } from '@/types/navigation';
import type { AdminInvoice } from '@/types/api/admin';
import type { InvoiceListFilter } from '@/types/invoice';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { spacing } from '@/theme/spacing';
import { formatINR } from '@/utils/currencyFormat';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminInvoicesStackParamList, 'InvoiceList'>;

export function InvoiceListScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const [listFilter, setListFilter] = useState<InvoiceListFilter>('all');
  const [search, setSearch] = useState('');
  const [bulkType, setBulkType] = useState<'non_gst' | 'gst'>('non_gst');
  const [bulkChannel, setBulkChannel] = useState<'email' | 'whatsapp'>('email');
  const [sendTarget, setSendTarget] = useState<AdminInvoice | null>(null);
  const [sendChannel, setSendChannel] = useState<'email' | 'whatsapp'>('email');

  const { data: stats, isLoading: statsLoading } = useGetInvoiceStatsQuery();
  const { data, isLoading, isError, error, refetch, isFetching } = useGetAdminInvoicesQuery({
    listFilter,
    search: search.trim() || undefined,
  });
  const [fetchInvoice] = useLazyGetInvoiceByIdQuery();
  const { generateAndUploadPDF } = useInvoicePDF();
  const [send, { isLoading: sending }] = useSendInvoiceMutation();
  const [bulkSend, { isLoading: bulkSending }] = useBulkSendInvoicesMutation();

  const filterOptions = useMemo(
    () => [
      { value: 'all' as const, label: `All (${stats?.totalInvoices ?? data?.length ?? 0})` },
      { value: 'pending' as const, label: `Pending (${stats?.pendingCount ?? 0})` },
      { value: 'non_gst_sent' as const, label: 'Non-GST sent' },
      { value: 'gst_sent' as const, label: 'GST sent' },
    ],
    [stats, data?.length],
  );

  const handleDownload = useCallback(
    async (item: NonNullable<typeof data>[number]) => {
      try {
        let path = item.pdfStoragePath;
        if (!path) {
          const invoice = await fetchInvoice(item.id).unwrap();
          path = await generateAndUploadPDF(invoice);
          refetch();
        }
        navigation.navigate('InvoicePdfViewer', {
          storagePath: path,
          title: `Invoice ${item.invoiceNumber}`,
          fileName: `${item.invoiceNumber}.pdf`,
        });
      } catch (e) {
        Alert.alert('Download failed', queryErrorMessage(e));
      }
    },
    [fetchInvoice, generateAndUploadPDF, navigation, refetch],
  );

  const handleSendConfirm = useCallback(
    async (payload: SendInvoiceRecipientPayload) => {
      if (!sendTarget) return;
      try {
        await send({
          invoiceId: sendTarget.id,
          channel: payload.channel,
          recipientEmail: payload.recipientEmail,
          recipientPhone: payload.recipientPhone,
        }).unwrap();
        dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Invoice sent' }));
        setSendTarget(null);
        refetch();
      } catch (e) {
        Alert.alert('Send failed', queryErrorMessage(e));
      }
    },
    [dispatch, refetch, send, sendTarget],
  );

  const openSendModal = useCallback((item: AdminInvoice, channel: 'email' | 'whatsapp') => {
    setSendChannel(channel);
    setSendTarget(item);
  }, []);

  const handleBulkSend = useCallback(async () => {
    try {
      const result = await bulkSend({ invoiceType: bulkType, channel: bulkChannel }).unwrap();
      dispatch(
        enqueueToast({
          id: Date.now().toString(),
          type: result.failed > 0 ? 'error' : 'success',
          message: `Sent ${result.sent}, failed ${result.failed}`,
        }),
      );
    } catch (e) {
      Alert.alert('Bulk send failed', queryErrorMessage(e));
    }
  }, [bulkChannel, bulkSend, bulkType, dispatch]);

  const renderItem = useCallback(
    ({ item }: { item: NonNullable<typeof data>[number] }) => (
      <InvoiceListRow
        item={item}
        onDownload={() => void handleDownload(item)}
        onSendEmail={() => openSendModal(item, 'email')}
        onSendWhatsApp={() => openSendModal(item, 'whatsapp')}
      />
    ),
    [handleDownload, openSendModal],
  );

  if (isLoading && !data) {
    return (
      <Screen style={adminScreenStyles.canvas}>
        <SkeletonLoader rows={8} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen style={adminScreenStyles.canvas}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  const invoices = data ?? [];

  return (
    <RoleGuard requiredPermission="invoices.view">
      <Screen padded={false} style={adminScreenStyles.canvas}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.toolbar}>
            <View style={styles.toolbarActions}>
              <Button label="Edit templates" variant="secondary" onPress={() => navigation.navigate('InvoiceSettings')} />
              <Button label="History" variant="secondary" onPress={() => navigation.navigate('InvoiceHistory')} />
            </View>
            <Button label="Create manual invoice" onPress={() => navigation.navigate('CreateInvoice', { invoiceType: 'gst' })} />
            <View style={styles.typeActions}>
              <Button label="Non-GST" variant="ghost" onPress={() => navigation.navigate('CreateInvoice', { invoiceType: 'non_gst' })} />
              <Button label="Custom GST" variant="ghost" onPress={() => navigation.navigate('CreateInvoice', { invoiceType: 'custom_gst' })} />
            </View>
          </View>

          {statsLoading || !stats ? (
            <SkeletonLoader rows={1} rowHeight={72} shape="card" />
          ) : (
            <View style={styles.kpiRow}>
              <AdminKPICard label="Total revenue" value={formatINR(stats.totalRevenue)} icon="₹" surface="blue" />
              <AdminKPICard label="Completed" value={String(stats.completedPayments)} icon="✅" surface="teal" status="healthy" />
            </View>
          )}

          <View style={styles.searchWrap}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search customer or invoice ID…" />
          </View>

          <View style={styles.bulkWrap}>
            <BulkDispatchCard
              invoiceType={bulkType}
              channel={bulkChannel}
              onInvoiceTypeChange={setBulkType}
              onChannelChange={setBulkChannel}
              onSend={() => void handleBulkSend()}
              sending={bulkSending}
            />
          </View>

          <View style={styles.filters}>
            <FilterChips options={filterOptions} selected={listFilter} onSelect={setListFilter} />
          </View>
        </ScrollView>

        {invoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            subtitle="Create a manual invoice or wait for payment records"
            icon="🧾"
            actionLabel="Create invoice"
            onAction={() => navigation.navigate('CreateInvoice', { invoiceType: 'gst' })}
          />
        ) : (
          <FlatList
            data={invoices}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            refreshing={isFetching}
            onRefresh={refetch}
            contentContainerStyle={styles.list}
          />
        )}
        <SendInvoiceRecipientModal
          visible={sendTarget != null}
          invoiceNumber={sendTarget?.invoiceNumber ?? ''}
          customerName={sendTarget?.customerName ?? ''}
          defaultEmail={sendTarget?.customerEmail}
          initialChannel={sendChannel}
          sending={sending}
          onClose={() => setSendTarget(null)}
          onSend={(payload) => void handleSendConfirm(payload)}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.sm },
  toolbar: { padding: spacing.sm, gap: spacing.sm },
  toolbarActions: { flexDirection: 'row', gap: spacing.sm },
  typeActions: { flexDirection: 'row', gap: spacing.xs },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.sm },
  searchWrap: { paddingHorizontal: spacing.sm },
  bulkWrap: { paddingHorizontal: spacing.sm, marginTop: spacing.sm },
  filters: { paddingHorizontal: spacing.sm, marginTop: spacing.sm },
  list: { paddingBottom: spacing.xl },
});

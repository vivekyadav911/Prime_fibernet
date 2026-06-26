import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';


import { AdminScreenLayout, AdminKPICard, FilterChips, RoleGuard, SearchBar } from '@/components/admin';
import { InvoiceListRow, SendInvoiceRecipientModal } from '@/components/invoices';
import type { SendInvoiceRecipientPayload } from '@/components/invoices';
import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { useInvoicePDF } from '@/hooks/useInvoicePDF';
import {
  useGetAdminInvoicesQuery,
  useGetInvoiceStatsQuery,
  useLazyGetInvoiceByIdQuery,
  useSendInvoiceMutation,
} from '@/store/api/endpoints';
import type { AdminInvoicesStackParamList } from '@/types/navigation';
import type { AdminInvoice } from '@/types/api/admin';
import type { InvoiceTypeFilter } from '@/types/invoice';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminInvoicesStackParamList, 'InvoiceHistory'>;

export function InvoiceHistoryScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<InvoiceTypeFilter>('all');
  const [sendTarget, setSendTarget] = useState<AdminInvoice | null>(null);
  const [sendChannel, setSendChannel] = useState<'email' | 'whatsapp'>('email');
  const [fetchInvoice] = useLazyGetInvoiceByIdQuery();
  const { generateAndUploadPDF } = useInvoicePDF();
  const [send, { isLoading: sending }] = useSendInvoiceMutation();

  const { data: stats, isLoading: statsLoading } = useGetInvoiceStatsQuery();
  const { data, isLoading, isError, error, refetch, isFetching } = useGetAdminInvoicesQuery({
    invoiceType: typeFilter,
    search: search.trim() || undefined,
  });

  const typeOptions = useMemo(
    () => [
      { value: 'all' as const, label: `All (${stats?.totalInvoices ?? 0})` },
      { value: 'non_gst' as const, label: `Non-GST (${stats?.nonGstCount ?? 0})` },
      { value: 'gst' as const, label: `GST (${stats?.gstCount ?? 0})` },
      { value: 'custom_gst' as const, label: `Custom GST (${stats?.customGstCount ?? 0})` },
    ],
    [stats],
  );

  const openSendModal = useCallback((item: AdminInvoice, channel: 'email' | 'whatsapp') => {
    setSendChannel(channel);
    setSendTarget(item);
  }, []);

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

  const invoices = data ?? [];

  return (
    <RoleGuard requiredPermission="invoices.view">
      <AdminScreenLayout>
        <ScrollView contentContainerStyle={styles.header}>
          {statsLoading || !stats ? (
            <SkeletonLoader rows={1} rowHeight={72} shape="card" />
          ) : (
            <View style={styles.kpiRow}>
              <AdminKPICard label="Total invoices" value={String(stats.totalInvoices)} icon="🧾" surface="blue" />
              <AdminKPICard label="Non-GST" value={String(stats.nonGstCount)} icon="📋" surface="teal" />
              <AdminKPICard label="GST" value={String(stats.gstCount)} icon="📄" surface="purple" />
              <AdminKPICard label="Custom GST" value={String(stats.customGstCount)} icon="✏️" surface="amber" />
            </View>
          )}
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search customer or invoice ID…" />
          <FilterChips options={typeOptions} selected={typeFilter} onSelect={setTypeFilter} />
        </ScrollView>

        {invoices.length === 0 ? (
          <EmptyState title="No invoice history" subtitle="Sent invoices will appear here" icon="🧾" />
        ) : (
          <FlatList
            data={invoices}
            keyExtractor={(i) => i.id}
            refreshing={isFetching}
            onRefresh={refetch}
            renderItem={({ item }) => (
              <InvoiceListRow
                item={item}
                onDownload={() => {
                  void (async () => {
                    try {
                      let path = item.pdfStoragePath;
                      if (!path) {
                        const invoice = await fetchInvoice(item.id).unwrap();
                        path = await generateAndUploadPDF(invoice);
                      }
                      navigation.navigate('InvoicePdfViewer', {
                        storagePath: path,
                        title: `Invoice ${item.invoiceNumber}`,
                        fileName: `${item.invoiceNumber}.pdf`,
                      });
                    } catch {
                      // Error surfaced via alert in list screen pattern — keep history lightweight
                    }
                  })();
                }}
                onSendEmail={() => openSendModal(item, 'email')}
                onSendWhatsApp={() => openSendModal(item, 'whatsapp')}
              />
            )}
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
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.sm, gap: spacing.sm },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

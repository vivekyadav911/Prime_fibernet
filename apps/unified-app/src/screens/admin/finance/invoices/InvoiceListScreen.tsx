import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AdminScreenLayout, AdminKPICard, FilterChips, RoleGuard, SearchBar } from '@/components/admin';
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
import { adminColors } from '@/theme/admin';
import { adminDesign } from '@/theme/adminDesign';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
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
    async (item: AdminInvoice) => {
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

  const invoicesRef = useRef<AdminInvoice[]>([]);

  const handleDownloadById = useCallback(
    (invoiceId: string) => {
      const item = invoicesRef.current.find((invoice) => invoice.id === invoiceId);
      if (item) void handleDownload(item);
    },
    [handleDownload],
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

  const openSendModalById = useCallback(
    (invoiceId: string, channel: 'email' | 'whatsapp') => {
      const item = invoicesRef.current.find((invoice) => invoice.id === invoiceId);
      if (item) openSendModal(item, channel);
    },
    [openSendModal],
  );

  const handleSendEmailById = useCallback(
    (invoiceId: string) => openSendModalById(invoiceId, 'email'),
    [openSendModalById],
  );

  const handleSendWhatsAppById = useCallback(
    (invoiceId: string) => openSendModalById(invoiceId, 'whatsapp'),
    [openSendModalById],
  );

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
    ({ item }: { item: AdminInvoice }) => (
      <InvoiceListRow
        item={item}
        onDownload={handleDownloadById}
        onSendEmail={handleSendEmailById}
        onSendWhatsApp={handleSendWhatsAppById}
      />
    ),
    [handleDownloadById, handleSendEmailById, handleSendWhatsAppById],
  );

  const listHeader = useMemo(
    () => (
      <View style={adminScreenStyles.listHeader}>
        <View style={styles.toolbar}>
          <View style={styles.toolbarActions}>
            <Pressable
              style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnPressed]}
              onPress={() => navigation.navigate('InvoiceSettings')}
            >
              <Text style={styles.btnSecondaryText}>Edit templates</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnPressed]}
              onPress={() => navigation.navigate('InvoiceHistory')}
            >
              <Text style={styles.btnSecondaryText}>History</Text>
            </Pressable>
          </View>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
            onPress={() => navigation.navigate('CreateInvoice', { invoiceType: 'gst' })}
          >
            <Text style={styles.btnPrimaryText}>Create manual invoice</Text>
          </Pressable>
          <View style={styles.typeActions}>
            <Pressable
              style={({ pressed }) => [styles.btnGhost, pressed && styles.btnPressed]}
              onPress={() => navigation.navigate('CreateInvoice', { invoiceType: 'non_gst' })}
            >
              <Text style={styles.btnGhostText}>Non-GST</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.btnGhost, pressed && styles.btnPressed]}
              onPress={() => navigation.navigate('CreateInvoice', { invoiceType: 'custom_gst' })}
            >
              <Text style={styles.btnGhostText}>Custom GST</Text>
            </Pressable>
          </View>
        </View>

        {statsLoading || !stats ? (
          <SkeletonLoader rows={1} rowHeight={72} shape="card" />
        ) : (
          <View style={styles.kpiRow}>
            <AdminKPICard label="Total revenue" value={formatINR(stats.totalRevenue)} icon="₹" surface="blue" />
            <AdminKPICard
              label="Completed"
              value={String(stats.completedPayments)}
              icon="✅"
              surface="teal"
              status="healthy"
            />
          </View>
        )}

        <SearchBar value={search} onChangeText={setSearch} placeholder="Search customer or invoice ID…" />

        <BulkDispatchCard
          invoiceType={bulkType}
          channel={bulkChannel}
          onInvoiceTypeChange={setBulkType}
          onChannelChange={setBulkChannel}
          onSend={() => void handleBulkSend()}
          sending={bulkSending}
        />

        <FilterChips options={filterOptions} selected={listFilter} onSelect={setListFilter} />
      </View>
    ),
    [
      bulkChannel,
      bulkSending,
      bulkType,
      filterOptions,
      handleBulkSend,
      listFilter,
      navigation,
      search,
      stats,
      statsLoading,
    ],
  );

  const listEmptyComponent = useMemo(
    () => (
      <EmptyState
        title="No invoices yet"
        subtitle="Create a manual invoice or wait for payment records"
        icon="🧾"
        actionLabel="Create invoice"
        onAction={() => navigation.navigate('CreateInvoice', { invoiceType: 'gst' })}
      />
    ),
    [navigation],
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
  invoicesRef.current = invoices;

  return (
    <RoleGuard requiredPermission="invoices.view">
      <AdminScreenLayout>
        <FlatList
          data={invoices}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmptyComponent}
          refreshing={isFetching}
          onRefresh={refetch}
          contentContainerStyle={adminScreenStyles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
        />
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
  toolbar: {
    gap: spacing.sm,
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  btnPrimary: {
    minHeight: adminDesign.button.minHeight,
    borderRadius: adminDesign.radius.button,
    backgroundColor: adminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: adminDesign.button.paddingHorizontal,
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.surfaceWhite,
  },
  btnSecondary: {
    flex: 1,
    minHeight: adminDesign.button.minHeight,
    borderRadius: adminDesign.radius.button,
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: adminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: adminColors.primary,
  },
  btnGhost: {
    flex: 1,
    minHeight: 44,
    borderRadius: adminDesign.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  btnGhostText: {
    fontSize: 15,
    fontWeight: '600',
    color: adminColors.primary,
  },
  btnPressed: {
    opacity: 0.85,
  },
});

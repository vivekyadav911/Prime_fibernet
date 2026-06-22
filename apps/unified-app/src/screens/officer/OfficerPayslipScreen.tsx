import { useCallback } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { Payslip } from '@prime/types';
import { Button } from '@prime/ui';

import { EmptyState, ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import { useAppSelector } from '@/store/hooks';
import { useGetPayslipsQuery } from '@/store/api/endpoints';
import { formatINR } from '@/utils/currencyFormat';
import { queryErrorMessage } from '@/utils/queryError';
import { shareLocalPdf } from '@/utils/storagePdf';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';

async function downloadPayslipPdf(payslipId: string, pdfUrl: string | null) {
  if (!pdfUrl) {
    Alert.alert('No PDF', 'PDF not available for this payslip yet.');
    return;
  }
  const localUri = `${FileSystem.cacheDirectory}payslip_${payslipId}.pdf`;
  const result = await FileSystem.downloadAsync(pdfUrl, localUri);
  if (result.status !== 200) {
    throw new Error(`Download failed with status ${result.status}`);
  }
  await shareLocalPdf({
    localUri: result.uri,
    title: 'Payslip',
    fileName: `payslip_${payslipId}.pdf`,
    webDownloadUrl: pdfUrl,
  });
}

function PayslipCard({
  item,
  onOpenPdf,
}: {
  item: Payslip;
  onOpenPdf: (id: string, url: string | null) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.month}>{item.month}</Text>
        <Text style={styles.paid}>PAID</Text>
      </View>
      <Text style={styles.net}>Net Salary: {formatINR(item.netPay)}</Text>
      <View style={styles.actions}>
        {item.pdfUrl ? (
          <Button label="Download PDF" variant="secondary" onPress={() => onOpenPdf(item.id, item.pdfUrl)} />
        ) : (
          <Text style={styles.noPdf}>PDF pending</Text>
        )}
      </View>
    </View>
  );
}

export function OfficerPayslipScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data, isLoading, isError, error, refetch } = useGetPayslipsQuery(user?.id ?? '', {
    skip: !user?.id,
  });

  const handleOpenPdf = useCallback((id: string, url: string | null) => {
    void downloadPayslipPdf(id, url).catch(() => {
      Alert.alert('Download failed', 'Could not download payslip PDF.');
    });
  }, []);

  const keyExtractor = useCallback((item: Payslip) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: Payslip }) => <PayslipCard item={item} onOpenPdf={handleOpenPdf} />,
    [handleOpenPdf],
  );

  if (isLoading) {
    return (
      <ScreenWrapper scrollable={false}>
        <SkeletonLoader rows={6} showAvatar />
      </ScreenWrapper>
    );
  }

  if (isError) {
    return (
      <ScreenWrapper scrollable={false}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </ScreenWrapper>
    );
  }

  if (!data?.length) {
    return (
      <ScreenWrapper scrollable={false}>
        <EmptyState title="No payslips" subtitle="Monthly payslips will appear here" icon="💰" />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  month: { fontSize: 16, fontWeight: '700', color: colors.primaryNavy },
  paid: { fontSize: 11, fontWeight: '700', color: colors.emerald },
  net: { fontSize: 15, color: colors.textPrimary, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  noPdf: { fontSize: 13, color: colors.textSecondary },
});

import { useCallback } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@prime/ui';

import { PayslipTimesheetCalendar } from '@/components/payroll/PayslipTimesheetCalendar';
import { ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import { useGetPayslipQuery } from '@/services/api/payrollApi';
import { useMyPayslips } from '@/hooks/useMyPayslips';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';
import type { OfficerPayslipStackParamList } from '@/types/navigation';
import type { Payslip } from '@/types/payslip';
import { formatCurrencyInrPrecise } from '@/utils/formatCurrency';
import { payslipPdfViewerParams } from '@/utils/payslipNavigation';
import { queryErrorMessage } from '@/utils/queryError';

type ListProps = NativeStackScreenProps<OfficerPayslipStackParamList, 'PayslipList'>;

function PayslipCard({
  item,
  onViewDetail,
  onViewPdf,
  onDownload,
}: {
  item: Payslip;
  onViewDetail: () => void;
  onViewPdf: () => void;
  onDownload: () => void;
}) {
  const hasPdf = Boolean(item.generatedPdfUrl);

  return (
    <View style={styles.card}>
      <Text style={styles.month}>{item.payPeriodLabel}</Text>
      <Text style={styles.status}>{item.status.toUpperCase()}</Text>
      <Text style={styles.net}>Net: {formatCurrencyInrPrecise(item.netPay)}</Text>
      {item.authorizedAt ? (
        <Text style={styles.date}>
          Approved {new Date(item.authorizedAt).toLocaleDateString('en-IN')}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button label="View details" variant="secondary" onPress={onViewDetail} />
        {hasPdf ? (
          <>
            <Button label="View PDF" variant="primary" onPress={onViewPdf} />
            <Button label="Download" variant="ghost" onPress={onDownload} />
          </>
        ) : (
          <Text style={styles.noPdf}>PDF not available yet</Text>
        )}
      </View>
    </View>
  );
}

export function OfficerPayslipScreen({ navigation }: ListProps) {
  const { payslips, isLoading, isError, error, refetch, sharePayslip } = useMyPayslips();

  const openPdf = useCallback(
    (item: Payslip) => {
      const params = payslipPdfViewerParams(item);
      if (!params) {
        Alert.alert('No PDF', 'This payslip PDF is not available yet.');
        return;
      }
      navigation.navigate('PayslipPdfViewer', params);
    },
    [navigation],
  );

  const downloadPdf = useCallback(
    (item: Payslip) => {
      if (!item.generatedPdfUrl) return;
      void sharePayslip(item.generatedPdfUrl, item).catch(() => {
        Alert.alert('Download failed', 'Could not download payslip PDF.');
      });
    },
    [sharePayslip],
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

  if (!payslips.length) {
    return (
      <ScreenWrapper scrollable={false}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No payslips yet</Text>
          <Text style={styles.emptySub}>
            Approved payslips will appear here once payroll is finalized.
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <FlatList
        data={payslips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PayslipCard
            item={item}
            onViewDetail={() => navigation.navigate('PayslipDetail', { payslipId: item.id })}
            onViewPdf={() => openPdf(item)}
            onDownload={() => downloadPdf(item)}
          />
        )}
      />
    </ScreenWrapper>
  );
}

type DetailProps = NativeStackScreenProps<OfficerPayslipStackParamList, 'PayslipDetail'>;

export function OfficerPayslipDetailScreen({ route, navigation }: DetailProps) {
  const { payslipId } = route.params;
  const { data: payslip, isLoading, isError, error, refetch } = useGetPayslipQuery(payslipId);
  const { sharePayslip } = useMyPayslips();

  const openPdf = useCallback(() => {
    if (!payslip) return;
    const params = payslipPdfViewerParams(payslip);
    if (!params) {
      Alert.alert('No PDF', 'This payslip PDF is not available yet.');
      return;
    }
    navigation.navigate('PayslipPdfViewer', params);
  }, [navigation, payslip]);

  const downloadPdf = useCallback(() => {
    if (!payslip?.generatedPdfUrl) return;
    void sharePayslip(payslip.generatedPdfUrl, payslip).catch(() => {
      Alert.alert('Download failed', 'Could not download payslip PDF.');
    });
  }, [payslip, sharePayslip]);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <SkeletonLoader rows={10} />
      </ScreenWrapper>
    );
  }

  if (isError || !payslip) {
    return (
      <ScreenWrapper>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </ScreenWrapper>
    );
  }

  const periodMonth = Number(payslip.payPeriodStart.slice(5, 7));
  const periodYear = Number(payslip.payPeriodStart.slice(0, 4));

  return (
    <ScreenWrapper>
      <View style={styles.detailHeader}>
        <Text style={styles.detailTitle}>{payslip.payPeriodLabel}</Text>
        <Text style={styles.detailNet}>{formatCurrencyInrPrecise(payslip.netPay)}</Text>
      </View>

      <View style={styles.detailStats}>
        <Text style={styles.statLine}>Hourly rate: {formatCurrencyInrPrecise(payslip.hourlyRate)}</Text>
        <Text style={styles.statLine}>Hours worked: {payslip.totalActualHours}</Text>
        <Text style={styles.statLine}>Gross: {formatCurrencyInrPrecise(payslip.grossEarnings)}</Text>
        {(payslip.lineItems ?? []).map((item) => (
          <Text key={item.id} style={styles.statLine}>
            {item.itemType === 'addition' ? '+' : '−'} {item.label}:{' '}
            {formatCurrencyInrPrecise(item.amount)}
          </Text>
        ))}
      </View>

      <PayslipTimesheetCalendar
        year={periodYear}
        month={periodMonth}
        breakdown={payslip.dailyBreakdown ?? []}
        accent="officer"
      />

      {payslip.generatedPdfUrl ? (
        <View style={styles.actions}>
          <Button label="View PDF" variant="primary" onPress={openPdf} />
          <Button label="Download PDF" variant="secondary" onPress={downloadPdf} />
        </View>
      ) : (
        <Text style={styles.noPdfDetail}>PDF will be available after admin generates it.</Text>
      )}
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
    gap: spacing.xxs,
  },
  month: { fontSize: 16, fontWeight: '700', color: colors.primaryNavy },
  status: { fontSize: 11, fontWeight: '700', color: colors.emerald },
  net: { fontSize: 15, color: colors.textPrimary },
  date: { fontSize: 12, color: colors.textSecondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  noPdf: { fontSize: 12, color: colors.textSecondary, alignSelf: 'center' },
  noPdfDetail: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.md },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.primaryNavy },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  detailHeader: { marginBottom: spacing.md },
  detailTitle: { fontSize: 20, fontWeight: '700', color: colors.primaryNavy },
  detailNet: { fontSize: 22, fontWeight: '800', color: colors.emerald, marginTop: spacing.xs },
  detailStats: { gap: spacing.xxs, marginBottom: spacing.md },
  statLine: { fontSize: 14, color: colors.textPrimary },
});

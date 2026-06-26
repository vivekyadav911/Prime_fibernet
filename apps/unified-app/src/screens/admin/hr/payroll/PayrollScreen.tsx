import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { FormField, RoleGuard, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { usePayrollDashboard } from '@/hooks/usePayrollDashboard';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminPayrollStackParamList } from '@/types/navigation';
import type { PayrollDashboardEntry } from '@/types/payslip';
import { formatCurrencyInrPrecise } from '@/utils/formatCurrency';
import { payslipPdfViewerParams } from '@/utils/payslipNavigation';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminPayrollStackParamList, 'PayrollHome'>;

export function PayrollScreen({ navigation }: Props) {
  const {
    month,
    year,
    setMonth,
    setYear,
    period,
    entries,
    isLoading,
    isError,
    error,
    refetch,
    triggerGenerate,
    triggerBulkGenerate,
    isGenerating,
  } = usePayrollDashboard();

  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const openReview = useCallback(
    (officerId: string, payslipId: string | null) => {
      navigation.navigate('PayslipReview', {
        officerId,
        periodStart: period.start,
        periodEnd: period.end,
        payslipId: payslipId ?? undefined,
      });
    },
    [navigation, period],
  );

  const openPdf = useCallback(
    (item: PayrollDashboardEntry) => {
      const params = payslipPdfViewerParams({
        generatedPdfUrl: item.generatedPdfUrl,
        payPeriodLabel: item.payPeriodLabel ?? 'Payslip',
        employeeName: item.officerName,
      });
      if (!params) {
        Alert.alert('No PDF', 'Generate the payslip PDF from the review screen first.');
        return;
      }
      navigation.navigate('PayslipPdfViewer', params);
    },
    [navigation],
  );

  const handleGenerate = useCallback(
    async (officerId: string, force = false) => {
      setGeneratingId(officerId);
      try {
        const result = await triggerGenerate(officerId, force);
        if (result.blocked) {
          Alert.alert(
            'Incomplete attendance',
            `Resolve clock-out on: ${result.blockingDates.join(', ')}`,
          );
          return;
        }
        if (result.payslipId) {
          openReview(officerId, result.payslipId);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Generation failed';
        if (msg.includes('force_overwrite_draft')) {
          Alert.alert('Draft exists', 'Overwrite existing draft?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Overwrite', onPress: () => void handleGenerate(officerId, true) },
          ]);
        } else {
          Alert.alert('Error', msg);
        }
      } finally {
        setGeneratingId(null);
      }
    },
    [triggerGenerate, openReview],
  );

  const handleGenerateAll = useCallback(async () => {
    const notStarted = entries.filter((e) => e.status === 'not_started' || e.status === 'draft');
    if (!notStarted.length) {
      Alert.alert('Nothing to generate', 'All officers have payslips for this period.');
      return;
    }
    Alert.alert('Generate all', `Generate payslips for ${notStarted.length} officers?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Generate',
        onPress: async () => {
          const results = await triggerBulkGenerate(notStarted.map((e) => e.officerId));
          const blocked = results.filter(
            (r) => r.status === 'fulfilled' && r.value.blocked,
          ).length;
          const ok = results.filter(
            (r) => r.status === 'fulfilled' && r.value.payslipId && !r.value.blocked,
          ).length;
          Alert.alert('Bulk complete', `${ok} generated, ${blocked} blocked, ${results.length - ok - blocked} skipped/failed.`);
          void refetch();
        },
      },
    ]);
  }, [entries, triggerBulkGenerate, refetch]);

  if (isLoading) {
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

  return (
    <RoleGuard requiredPermission="payroll.view">
      <Screen padded={false} style={adminScreenStyles.canvas}>
        <View style={styles.toolbar}>
          <FormField
            label="Month"
            value={String(month)}
            onChangeText={(v) => setMonth(Number(v) || 1)}
            keyboardType="number-pad"
          />
          <FormField
            label="Year"
            value={String(year)}
            onChangeText={(v) => setYear(Number(v) || year)}
            keyboardType="number-pad"
          />
          <View style={styles.toolbarActions}>
            <Button
              label="Settings"
              variant="ghost"
              onPress={() => navigation.navigate('PayslipSettings')}
            />
            <Button
              label="Generate all"
              variant="secondary"
              onPress={() => void handleGenerateAll()}
              disabled={isGenerating}
            />
          </View>
        </View>

        <FlatList
          data={entries}
          keyExtractor={(r) => r.officerId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.name}>{item.officerName}</Text>
                <StatusBadge status={item.status === 'not_started' ? 'pending' : item.status} />
              </View>
              {item.netPayPreview != null ? (
                <Text style={styles.net}>Net {formatCurrencyInrPrecise(item.netPayPreview)}</Text>
              ) : null}
              {item.blocked ? (
                <Text style={styles.blocked}>Incomplete attendance — resolve first</Text>
              ) : null}
              <View style={styles.actions}>
                {item.payslipId ? (
                  <>
                    <Button
                      label="Review"
                      variant="primary"
                      onPress={() => openReview(item.officerId, item.payslipId)}
                    />
                    {item.generatedPdfUrl ? (
                      <Button
                        label="View PDF"
                        variant="secondary"
                        onPress={() => openPdf(item)}
                      />
                    ) : null}
                  </>
                ) : (
                  <Button
                    label="Generate"
                    variant="secondary"
                    onPress={() => void handleGenerate(item.officerId)}
                    disabled={generatingId === item.officerId}
                  />
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No officers found</Text>
          }
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  toolbar: { padding: spacing.sm, gap: spacing.xs },
  toolbarActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  list: { paddingBottom: spacing.lg },
  row: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xs,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: '600', color: colors.textPrimary, flex: 1 },
  net: { fontWeight: '700', color: adminColors.primary },
  blocked: { fontSize: 12, color: colors.errorRed },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  empty: { textAlign: 'center', color: colors.textSecondary, padding: spacing.lg },
});

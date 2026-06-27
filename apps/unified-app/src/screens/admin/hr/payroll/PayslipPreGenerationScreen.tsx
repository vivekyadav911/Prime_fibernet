import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminButton, AdminScreenLayout, AdminStateShell, RoleGuard } from '@/components/admin';
import { PayrollWarningBadges } from '@/components/payroll/PayrollWarningBadges';
import {
  useCalculatePayslipMutation,
  useGetPayrollGenerationPreviewQuery,
} from '@/services/api/payrollApi';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminPayrollStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<AdminPayrollStackParamList, 'PayslipPreGeneration'>;

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

export function PayslipPreGenerationScreen({ route, navigation }: Props) {
  const { officerId, officerName, periodStart, periodEnd, payslipId } = route.params;
  const { data, isLoading, isError, error, refetch } = useGetPayrollGenerationPreviewQuery({
    officerId,
    payPeriodStart: periodStart,
    payPeriodEnd: periodEnd,
  });
  const [calculatePayslip, { isLoading: isGenerating }] = useCalculatePayslipMutation();
  const [forceOverwrite, setForceOverwrite] = useState(false);

  const handleGenerate = useCallback(async (overwrite = false) => {
    if (!data?.canGenerate) {
      Alert.alert(
        'Cannot generate',
        data?.warnings.join('\n') || 'Resolve attendance and officer profile issues first.',
      );
      return;
    }

    try {
      const result = await calculatePayslip({
        officerId,
        payPeriodStart: periodStart,
        payPeriodEnd: periodEnd,
        forceOverwriteDraft: overwrite || forceOverwrite || Boolean(payslipId),
      }).unwrap();
      if (result.blocked) {
        Alert.alert('Blocked', `Incomplete attendance on: ${result.blockingDates.join(', ')}`);
        return;
      }
      if (result.payslipId) {
        navigation.replace('PayslipReview', {
          officerId,
          periodStart,
          periodEnd,
          payslipId: result.payslipId,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Generation failed';
      if (msg.includes('force_overwrite_draft')) {
        Alert.alert('Draft exists', 'Overwrite existing draft payslip?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Overwrite',
            onPress: () => {
              setForceOverwrite(true);
              void handleGenerate(true);
            },
          },
        ]);
      } else {
        Alert.alert('Error', msg);
      }
    }
  }, [
    data,
    forceOverwrite,
    navigation,
    officerId,
    payslipId,
    periodEnd,
    periodStart,
    calculatePayslip,
  ]);

  const summary = data?.attendanceSummary;

  return (
    <RoleGuard requiredPermission="payroll.edit">
      <AdminStateShell
        isLoading={isLoading}
        isError={isError || !data}
        error={error}
        onRetry={refetch}
        loadingRows={8}
      >
      {data && summary ? (
      <AdminScreenLayout padded={false}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.headerCard}>
            <Text style={styles.title}>{officerName}</Text>
            <Text style={styles.subtitle}>{data.periodLabel}</Text>
            <Text style={styles.hint}>
              Attendance counts below are sourced directly from the Attendance module for this pay
              period. Review before generating the payslip snapshot.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Attendance summary</Text>
            <View style={styles.statsGrid}>
              <StatCell label="Present" value={summary.present} />
              <StatCell label="Absent" value={summary.absent} />
              <StatCell label="Leave" value={summary.leave} />
              <StatCell label="Holiday" value={summary.holiday} />
              <StatCell label="Weekly off" value={summary.weeklyOff} />
              <StatCell label="Unresolved" value={summary.unresolved} />
            </View>
            {summary.noShiftAssigned ? (
              <Text style={styles.warningText}>
                No shift schedule assigned — assign a shift before generating (not an attendance
                check-in issue).
              </Text>
            ) : null}
            {summary.incomplete > 0 ? (
              <Text style={styles.warningText}>
                {summary.incomplete} day(s) have check-in without check-out.
              </Text>
            ) : null}
            {summary.unresolvedDates.length ? (
              <Text style={styles.warningText}>
                Unresolved dates: {summary.unresolvedDates.slice(0, 8).join(', ')}
                {summary.unresolvedDates.length > 8 ? '…' : ''}
              </Text>
            ) : null}
          </View>

          {data.warnings.length ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Issues</Text>
              {data.warnings.map((w) => (
                <Text key={w} style={styles.warningText}>
                  • {w}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <AdminButton label="Back" variant="ghost" onPress={() => navigation.goBack()} />
            <AdminButton
              label={data.canGenerate ? 'Generate payslip' : 'Blocked — fix issues first'}
              variant="primary"
              onPress={() => void handleGenerate()}
              disabled={!data.canGenerate || isGenerating}
            />
          </View>
        </ScrollView>
      </AdminScreenLayout>
      ) : null}
      </AdminStateShell>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  headerCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xxs,
  },
  title: { fontSize: 18, fontWeight: '700', color: adminColors.primary },
  subtitle: { fontSize: 13, color: colors.textSecondary },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.sm,
  },
  sectionTitle: { fontWeight: '700', fontSize: 14, color: adminColors.primary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCell: {
    minWidth: 72,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    alignItems: 'center',
  },
  statVal: { fontWeight: '700', fontSize: 16, color: colors.textPrimary },
  statLbl: { fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase' },
  warningText: { fontSize: 12, color: colors.errorRed },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});

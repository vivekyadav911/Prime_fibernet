import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@prime/ui';

import { FormField, RoleGuard } from '@/components/admin';
import { SalaryTotalDisplay } from '@/components/admin/officers';
import {
  SaveButton,
  SettingsHubLayout,
  SettingsSection,
  SettingsSelect,
} from '@/components/admin/settings';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  useGetOfficerSalaryConfigsQuery,
  useUpsertOfficerSalaryConfigMutation,
} from '@/store/api/endpoints';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { OfficerSalaryRow, SalaryType } from '@/types/settings';
import { queryErrorMessage } from '@/utils/queryError';

const SALARY_TYPES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'daily', label: 'Daily' },
  { value: 'hourly', label: 'Hourly' },
];

type OfficerSalaryCardProps = {
  row: OfficerSalaryRow;
};

function OfficerSalaryCard({ row }: OfficerSalaryCardProps) {
  const dispatch = useAppDispatch();
  const [upsert, { isLoading }] = useUpsertOfficerSalaryConfigMutation();
  const [salaryType, setSalaryType] = useState<SalaryType>(row.salary?.salaryType ?? 'monthly');
  const [basic, setBasic] = useState(String(row.salary?.basicSalary ?? 0));
  const [hra, setHra] = useState(String(row.salary?.hra ?? 0));
  const [transport, setTransport] = useState(String(row.salary?.transportAllowance ?? 0));
  const [other, setOther] = useState(String(row.salary?.otherAllowances ?? 0));

  const total =
    Number(basic || 0) + Number(hra || 0) + Number(transport || 0) + Number(other || 0);

  const handleSave = async () => {
    try {
      await upsert({
        officerId: row.officerId,
        config: {
          officerId: row.officerId,
          salaryType,
          basicSalary: Number(basic || 0),
          hra: Number(hra || 0),
          transportAllowance: Number(transport || 0),
          otherAllowances: Number(other || 0),
        },
      }).unwrap();
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: `Salary saved for ${row.officerName}` }));
    } catch (e) {
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: queryErrorMessage(e) }));
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{row.officerName}</Text>
      <Text style={styles.cardEmail}>{row.officerEmail}</Text>

      {!row.hasActiveContract ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>No active contract found. Please create a contract first.</Text>
        </View>
      ) : null}

      <SettingsSelect label="Salary Type" value={salaryType} options={SALARY_TYPES} onSelect={(v) => setSalaryType(v as SalaryType)} />

      {salaryType === 'monthly' ? (
        <>
          <FormField label="Basic Salary" value={basic} onChangeText={setBasic} keyboardType="numeric" />
          <FormField label="HRA" value={hra} onChangeText={setHra} keyboardType="numeric" />
          <FormField label="Transport Allowance" value={transport} onChangeText={setTransport} keyboardType="numeric" />
          <FormField label="Other Allowances" value={other} onChangeText={setOther} keyboardType="numeric" />
          <SalaryTotalDisplay total={total} />
        </>
      ) : null}

      <SaveButton
        label="Save Salary Configuration"
        onPress={handleSave}
        loading={isLoading}
        disabled={!row.hasActiveContract}
      />
    </View>
  );
}

export function OfficerSalaryScreen() {
  const { data, isLoading, isError, error, refetch } = useGetOfficerSalaryConfigsQuery();

  const body = isLoading ? (
    <SkeletonLoader rows={6} />
  ) : isError ? (
    <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
  ) : (
    <SettingsSection title="Officer Salary Configuration">
      {(data ?? []).map((row) => (
        <OfficerSalaryCard key={row.officerId} row={row} />
      ))}
    </SettingsSection>
  );

  return (
    <RoleGuard requiredPermission="settings.view">
      <Screen style={styles.screen}>
        <SettingsHubLayout activeRoute="OfficerSalary">
          <ScrollView contentContainerStyle={styles.content}>{body}</ScrollView>
        </SettingsHubLayout>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: adminColors.canvasBg },
  content: { padding: 16 },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  cardEmail: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm },
  warning: {
    backgroundColor: adminColors.badgeWarning + '22',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  warningText: { fontSize: 13, color: adminColors.badgeWarning, fontWeight: '600' },
});

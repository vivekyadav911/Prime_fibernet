import { useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { FormField, RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { usePayslipSettings } from '@/hooks/usePayslipSettings';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminPayrollStackParamList } from '@/types/navigation';
import { formatCurrencyInrPrecise } from '@/utils/formatCurrency';

type Props = NativeStackScreenProps<AdminPayrollStackParamList, 'PayslipSettings'>;

type Tab = 'rules' | 'thresholds' | 'holidays' | 'compensation';

export function PayslipSettingsScreen(_props: Props) {
  const [tab, setTab] = useState<Tab>('rules');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [compOfficerId, setCompOfficerId] = useState('');
  const [compSalary, setCompSalary] = useState('');
  const [compEffectiveFrom, setCompEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const {
    payTypeRules,
    labelThresholds,
    companyHolidays,
    compensations,
    isLoading,
    isError,
    refetch,
    createHoliday,
    deleteHoliday,
    upsertCompensation,
  } = usePayslipSettings();

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={8} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState message="Could not load payslip settings" onRetry={refetch} />
      </Screen>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'rules', label: 'Pay rules' },
    { id: 'thresholds', label: 'Labels' },
    { id: 'holidays', label: 'Holidays' },
    { id: 'compensation', label: 'Salary' },
  ];

  return (
    <RoleGuard requiredPermission="payroll.edit">
      <Screen padded={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
          {tabs.map((t) => (
            <Button
              key={t.id}
              label={t.label}
              variant={tab === t.id ? 'primary' : 'ghost'}
              onPress={() => setTab(t.id)}
            />
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.content}>
          {tab === 'rules' ? (
            payTypeRules.map((rule) => (
              <View key={rule.id} style={styles.card}>
                <Text style={styles.cardTitle}>{rule.attendanceStatus}</Text>
                <Text style={styles.cardMeta}>
                  Pay fraction: {rule.payFraction} ·{' '}
                  {rule.usesScheduledHours ? 'Scheduled hours' : 'Actual hours'}
                </Text>
                {rule.description ? (
                  <Text style={styles.cardDesc}>{rule.description}</Text>
                ) : null}
              </View>
            ))
          ) : null}

          {tab === 'thresholds' ? (
            labelThresholds.map((th) => (
              <View key={th.id} style={styles.card}>
                <Text style={styles.cardTitle}>{th.label}</Text>
                <Text style={styles.cardMeta}>
                  Min: {(th.minHoursFraction * 100).toFixed(0)}%
                  {th.maxHoursFraction != null
                    ? ` · Max: ${(th.maxHoursFraction * 100).toFixed(0)}%`
                    : ''}
                </Text>
              </View>
            ))
          ) : null}

          {tab === 'holidays' ? (
            <>
              <View style={styles.form}>
                <FormField label="Date (YYYY-MM-DD)" value={holidayDate} onChangeText={setHolidayDate} />
                <FormField label="Holiday name" value={holidayName} onChangeText={setHolidayName} />
                <Button
                  label="Add holiday"
                  variant="secondary"
                  onPress={() => {
                    if (!holidayDate || !holidayName.trim()) {
                      Alert.alert('Required', 'Enter date and name.');
                      return;
                    }
                    void createHoliday({ holidayDate, name: holidayName.trim() })
                      .unwrap()
                      .then(() => {
                        setHolidayDate('');
                        setHolidayName('');
                      })
                      .catch((e) =>
                        Alert.alert('Error', e instanceof Error ? e.message : 'Failed'),
                      );
                  }}
                />
              </View>
              {companyHolidays.map((h) => (
                <View key={h.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{h.name}</Text>
                  <Text style={styles.cardMeta}>{h.holidayDate}</Text>
                  <Button
                    label="Remove"
                    variant="ghost"
                    onPress={() =>
                      void deleteHoliday(h.id)
                        .unwrap()
                        .catch((e) =>
                          Alert.alert('Error', e instanceof Error ? e.message : 'Failed'),
                        )
                    }
                  />
                </View>
              ))}
            </>
          ) : null}

          {tab === 'compensation' ? (
            <>
              <View style={styles.form}>
                <FormField
                  label="Officer ID (UUID)"
                  value={compOfficerId}
                  onChangeText={setCompOfficerId}
                />
                <FormField
                  label="Monthly salary"
                  value={compSalary}
                  onChangeText={setCompSalary}
                  keyboardType="decimal-pad"
                />
                <FormField
                  label="Effective from"
                  value={compEffectiveFrom}
                  onChangeText={setCompEffectiveFrom}
                />
                <Button
                  label="Set compensation"
                  variant="secondary"
                  onPress={() => {
                    const salary = Number(compSalary);
                    if (!compOfficerId.trim() || !Number.isFinite(salary)) {
                      Alert.alert('Invalid', 'Enter officer ID and salary.');
                      return;
                    }
                    void upsertCompensation({
                      officerId: compOfficerId.trim(),
                      monthlySalary: salary,
                      effectiveFrom: compEffectiveFrom,
                    })
                      .unwrap()
                      .then(() => Alert.alert('Saved', 'Compensation updated.'))
                      .catch((e) =>
                        Alert.alert('Error', e instanceof Error ? e.message : 'Failed'),
                      );
                  }}
                />
              </View>
              <FlatList
                data={compensations}
                scrollEnabled={false}
                keyExtractor={(c) => c.id}
                renderItem={({ item }) => (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Officer {item.officerId.slice(0, 8)}…</Text>
                    <Text style={styles.cardMeta}>
                      {formatCurrencyInrPrecise(item.monthlySalary)}/mo · from {item.effectiveFrom}
                    </Text>
                  </View>
                )}
              />
            </>
          ) : null}
        </ScrollView>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  tabBar: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, maxHeight: 52 },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xxs,
  },
  cardTitle: { fontWeight: '600', fontSize: 14, textTransform: 'capitalize' },
  cardMeta: { fontSize: 12, color: colors.textSecondary },
  cardDesc: { fontSize: 12, color: colors.textPrimary },
  form: { gap: spacing.sm, marginBottom: spacing.md },
});

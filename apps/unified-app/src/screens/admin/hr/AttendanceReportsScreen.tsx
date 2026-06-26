import { ScrollView, StyleSheet, Text } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { AdminScreenLayout, RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useAttendanceReports } from '@/hooks/attendance/useAdminAttendance';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'AttendanceReports'>;

export function AttendanceReportsScreen(_props: Props) {
  const { data, isLoading, isError, error, refetch } = useAttendanceReports({});

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={8} />
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  const lineData = data.dailyTrend.slice(-14).map((d) => ({
    value: d.present,
    label: d.date.slice(5),
  }));

  const barData = data.onTimeRate.slice(0, 6).map((o) => ({
    value: o.rate,
    label: o.officerName.split(' ')[0]?.slice(0, 6) ?? '',
    frontColor: adminColors.primary,
  }));

  const pieData = [
    { value: data.geofenceCompliance.inZone, color: colors.successGreen, text: 'In zone' },
    { value: data.geofenceCompliance.approvedOutside, color: colors.warningAmber, text: 'Approved' },
    { value: data.geofenceCompliance.unauthorized, color: colors.errorRed, text: 'Flagged' },
  ].filter((d) => d.value > 0);

  return (
    <RoleGuard requiredPermission="reports.view">
      <AdminScreenLayout>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.sectionTitle}>Daily attendance trend</Text>
          <LineChart
            data={lineData}
            height={180}
            spacing={28}
            color={adminColors.primary}
            hideRules
            yAxisTextStyle={styles.axis}
            xAxisLabelTextStyle={styles.axis}
          />

          <Text style={styles.sectionTitle}>On-time rate by officer</Text>
          <BarChart
            data={barData}
            barWidth={28}
            height={180}
            yAxisTextStyle={styles.axis}
            xAxisLabelTextStyle={styles.axis}
          />

          <Text style={styles.sectionTitle}>Geofence compliance</Text>
          {pieData.length > 0 ? (
            <PieChart
              data={pieData}
              donut
              radius={90}
              innerRadius={50}
              centerLabelComponent={() => (
                <Text style={styles.pieCenter}>Compliance</Text>
              )}
            />
          ) : (
            <Text style={styles.empty}>No compliance data yet</Text>
          )}
        </ScrollView>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  axis: { fontSize: 10, color: colors.textSecondary },
  pieCenter: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  empty: { color: colors.textSecondary, textAlign: 'center', padding: spacing.lg },
});

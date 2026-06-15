import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { LocationHistoryPoint } from '@/types/map';
import { computeHourlyBreakdown } from '@/utils/activityComputer';

type Props = {
  points: LocationHistoryPoint[];
};

export function ActivityBreakdownChart({ points }: Props) {
  const hourly = computeHourlyBreakdown(points);
  const barData = hourly.map((h) => ({
    value: h.minutes,
    label: h.hour % 3 === 0 ? String(h.hour) : '',
    frontColor: adminColors.primary,
  }));

  const maxVal = Math.max(...hourly.map((h) => h.minutes), 1);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Activity Breakdown</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={barData}
          barWidth={8}
          spacing={4}
          roundedTop
          hideRules
          xAxisThickness={1}
          yAxisThickness={0}
          maxValue={maxVal + 5}
          height={120}
          width={Math.max(280, barData.length * 14)}
          yAxisTextStyle={styles.axis}
          xAxisLabelTextStyle={styles.axis}
          noOfSections={4}
        />
      </ScrollView>
      <Text style={styles.hint}>Minutes active per hour (0–23)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md },
  title: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  axis: { fontSize: 10, color: colors.textSecondary },
  hint: { fontSize: 11, color: colors.textSecondary, marginTop: spacing.xs },
});

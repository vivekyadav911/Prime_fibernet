import { StyleSheet, Text, View } from 'react-native';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type KPICardProps = {
  label: string;
  value: string | number;
  icon?: string;
  trend?: number;
};

export function AdminKPICard({ label, value, icon, trend }: KPICardProps) {
  return (
    <View style={styles.card}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {trend != null ? (
        <Text style={[styles.trend, trend >= 0 ? styles.trendUp : styles.trendDown]}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: adminColors.primary,
  },
  icon: { fontSize: 20, marginBottom: spacing.xxs },
  value: { fontSize: 24, fontWeight: '700', color: adminColors.primary },
  label: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xxs },
  trend: { fontSize: 11, marginTop: spacing.xxs, fontWeight: '600' },
  trendUp: { color: adminColors.badgeActive },
  trendDown: { color: adminColors.badgeBlocked },
});

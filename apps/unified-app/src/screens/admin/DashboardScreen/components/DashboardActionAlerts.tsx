import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export type ActionAlert = {
  id: string;
  label: string;
  count: number;
  tone: 'critical' | 'warning' | 'info' | 'success';
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

type DashboardActionAlertsProps = {
  alerts: ActionAlert[];
};

const TONE_ACCENT = {
  critical: adminColors.badgeBlocked,
  warning: adminColors.badgePending,
  info: adminColors.primary,
  success: adminColors.badgeActive,
} as const;

function ActionAlertChip({ alert }: { alert: ActionAlert }) {
  const accent = TONE_ACCENT[alert.tone];

  return (
    <Pressable
      onPress={alert.onPress}
      style={({ pressed }) => [
        styles.chip,
        { borderLeftColor: accent },
        pressed && styles.chipPressed,
      ]}
    >
      <Ionicons name={alert.icon} size={13} color={accent} />
      <Text style={[styles.chipCount, { color: accent }]}>{alert.count}</Text>
      <Text style={styles.chipLabel} numberOfLines={1}>
        {alert.label}
      </Text>
      <Ionicons name="chevron-forward" size={11} color={colors.textSecondary} />
    </Pressable>
  );
}

export function DashboardActionAlerts({ alerts }: DashboardActionAlertsProps) {
  const visible = alerts.filter((a) => a.count > 0);
  if (!visible.length) {
    return (
      <View style={styles.clearState}>
        <View style={styles.clearMark} />
        <Text style={styles.clearText}>All clear — no urgent actions</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {visible.map((alert) => (
        <ActionAlertChip key={alert.id} alert={alert} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs,
    paddingBottom: spacing.xxs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: adminColors.dashboard.alertBg,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: adminColors.dashboard.panelBorder,
    borderLeftWidth: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: 188,
  },
  chipPressed: {
    backgroundColor: adminColors.dashboard.metricBg,
  },
  chipCount: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  clearState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  clearMark: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: adminColors.badgeActive,
  },
  clearText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
});

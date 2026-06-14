import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export type StatusHighlight = {
  id: string;
  count: number;
  label: string;
  sublabel: string;
  tone: 'neutral' | 'warning' | 'critical' | 'info';
  onPress: () => void;
};

type DashboardStatusHighlightsProps = {
  highlights: StatusHighlight[];
};

const TONE_VALUE: Record<StatusHighlight['tone'], string> = {
  neutral: colors.textPrimary,
  warning: adminColors.badgePending,
  critical: adminColors.badgeBlocked,
  info: adminColors.primary,
};

const TONE_CELL_BG: Record<StatusHighlight['tone'], string> = {
  neutral: adminColors.dashboard.surfacePastel,
  warning: adminColors.dashboard.actionWarningBg,
  critical: adminColors.dashboard.actionCriticalBg,
  info: adminColors.dashboard.actionInfoBg,
};

function HighlightCell({ item, showDivider }: { item: StatusHighlight; showDivider: boolean }) {
  const isActive = item.count > 0;
  const valueColor = isActive ? TONE_VALUE[item.tone] : colors.textPrimary;
  const cellBg = isActive ? TONE_CELL_BG[item.tone] : adminColors.dashboard.surfacePastel;

  return (
    <>
      {showDivider ? <View style={styles.divider} /> : null}
      <Pressable
        onPress={item.onPress}
        style={({ pressed }) => [
          styles.cell,
          { backgroundColor: cellBg },
          pressed && styles.cellPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${item.count} ${item.sublabel} ${item.label}`}
      >
        <Text style={[styles.count, { color: valueColor }]}>{item.count}</Text>
        <Text style={styles.sublabel} numberOfLines={1}>
          {item.sublabel}
        </Text>
        <Text style={styles.label} numberOfLines={1}>
          {item.label}
        </Text>
        {isActive ? (
          <Ionicons name="chevron-forward" size={10} color={colors.textSecondary} style={styles.chevron} />
        ) : null}
      </Pressable>
    </>
  );
}

export function DashboardStatusHighlights({ highlights }: DashboardStatusHighlightsProps) {
  return (
    <View style={styles.strip}>
      {highlights.map((item, index) => (
        <HighlightCell key={item.id} item={item} showDivider={index > 0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: adminColors.dashboard.panelBorder,
    overflow: 'hidden',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xxs,
    minWidth: 0,
    position: 'relative',
  },
  cellPressed: {
    opacity: 0.88,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: adminColors.dashboard.panelBorder,
  },
  count: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  sublabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 1,
  },
  chevron: {
    position: 'absolute',
    top: spacing.xxs,
    right: spacing.xxs,
    opacity: 0.7,
  },
});

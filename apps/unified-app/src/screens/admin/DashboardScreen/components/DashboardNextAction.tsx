import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export type NextActionTone = 'primary' | 'warning' | 'critical' | 'neutral';

export type NextAction = {
  label: string;
  sublabel: string;
  tone: NextActionTone;
  onPress: () => void;
};

type DashboardNextActionProps = {
  action: NextAction;
};

const TONE_ACCENT: Record<NextActionTone, string> = {
  primary: adminColors.primary,
  warning: adminColors.badgePending,
  critical: adminColors.badgeBlocked,
  neutral: adminColors.kpiSurfaces.neutral.accent,
};

export function DashboardNextAction({ action }: DashboardNextActionProps) {
  const accent = TONE_ACCENT[action.tone];

  return (
    <Pressable
      onPress={action.onPress}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      style={({ pressed }) => [styles.cta, { borderLeftColor: accent }, pressed && styles.ctaPressed]}
    >
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>Tap next</Text>
        <Text style={styles.label} numberOfLines={1}>
          {action.label}
        </Text>
        <Text style={styles.sublabel} numberOfLines={1}>
          {action.sublabel}
        </Text>
      </View>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
        <Ionicons name="arrow-forward" size={18} color={accent} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: adminColors.dashboard.panelBorder,
    borderLeftWidth: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  ctaPressed: {
    backgroundColor: adminColors.dashboard.ctaPressedBg,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  sublabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

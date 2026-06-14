import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppSelector } from '@/store/hooks';
import { formatINR } from '@/utils/planUtils';

import { dash } from '../dashboardUi';
import { DashboardCard } from './ui/DashboardPrimitives';

type HeroChip = {
  label: string;
  value: string;
  status?: string;
  statusTone?: 'success' | 'warning' | 'neutral';
};

type PrimaryOperationsCardProps = {
  headline: string;
  subline: string;
  onPress: () => void;
  mrr: number;
  subscribers: number;
  openRequests: number;
  revenueTrendPercent?: number;
};

function formatCompactINR(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0';
  if (amount >= 100_000) {
    const lakhs = amount / 100_000;
    return `₹${lakhs >= 10 ? Math.round(lakhs) : lakhs.toFixed(1)}L`;
  }
  if (amount >= 1_000) {
    const k = amount / 1_000;
    return `₹${k >= 10 ? Math.round(k) : k.toFixed(1)}K`;
  }
  return formatINR(amount);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const STATUS_COLOR = {
  success: dash.success,
  warning: dash.warning,
  neutral: dash.textSecondary,
} as const;

export function PrimaryOperationsCard({
  headline,
  subline,
  onPress,
  mrr,
  subscribers,
  openRequests,
  revenueTrendPercent,
}: PrimaryOperationsCardProps) {
  const firstName = useAppSelector((s) => s.auth.user?.name)?.split(' ')[0] ?? 'Admin';

  const chips: HeroChip[] = [
    {
      label: 'MRR',
      value: formatCompactINR(mrr),
      status:
        revenueTrendPercent != null
          ? `${revenueTrendPercent >= 0 ? '+' : ''}${revenueTrendPercent}% MoM`
          : undefined,
      statusTone:
        revenueTrendPercent == null
          ? 'neutral'
          : revenueTrendPercent >= 0
            ? 'success'
            : 'warning',
    },
    {
      label: 'Subscribers',
      value: subscribers.toLocaleString('en-IN'),
      status: 'Active base',
      statusTone: 'neutral',
    },
    {
      label: 'Open requests',
      value: openRequests.toLocaleString('en-IN'),
      status: openRequests > 0 ? 'Needs triage' : 'Clear',
      statusTone: openRequests > 0 ? 'warning' : 'success',
    },
  ];

  return (
    <DashboardCard padding={dash.heroPad} radius={dash.radiusHero} style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.greeting}>
          {getGreeting()}, {firstName}
        </Text>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.messageBlock, pressed && styles.messagePressed]}
        accessibilityRole="button"
        accessibilityLabel={headline}
      >
        <Text style={styles.headline} numberOfLines={2}>
          {headline}
        </Text>
        <Text style={styles.subline} numberOfLines={2}>
          {subline}
        </Text>
      </Pressable>

      <View style={styles.chipRow}>
        {chips.map((chip, index) => (
          <View key={chip.label} style={[styles.chip, index < chips.length - 1 && styles.chipDivider]}>
            <Text style={styles.chipLabel}>{chip.label}</Text>
            <Text style={styles.chipValue}>{chip.value}</Text>
            {chip.status ? (
              <Text
                style={[
                  styles.chipStatus,
                  { color: STATUS_COLOR[chip.statusTone ?? 'neutral'] },
                ]}
                numberOfLines={1}
              >
                {chip.status}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: dash.heroMinH,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '500',
    color: dash.textSecondary,
    flex: 1,
  },
  livePill: {
    height: dash.livePillH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: dash.radiusPill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dash.border,
    backgroundColor: dash.bg,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: dash.success,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '600',
    color: dash.textSecondary,
  },
  messageBlock: {
    gap: 3,
    minHeight: dash.touch,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  messagePressed: {
    opacity: 0.88,
  },
  headline: {
    fontSize: 23,
    fontWeight: '700',
    color: dash.text,
    letterSpacing: -0.4,
    lineHeight: 27,
  },
  subline: {
    fontSize: 14,
    fontWeight: '500',
    color: dash.textSecondary,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: dash.border,
    paddingTop: 8,
    marginTop: 2,
  },
  chip: {
    flex: 1,
    paddingHorizontal: 3,
    gap: 0,
  },
  chipDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: dash.border,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: dash.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: dash.metricGap,
  },
  chipValue: {
    fontSize: 19,
    fontWeight: '700',
    color: dash.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  chipStatus: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
});

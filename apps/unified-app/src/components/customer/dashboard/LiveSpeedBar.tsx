import { StyleSheet, Text, View } from 'react-native';

import { CustomerBadge, GlassCard, PressableScale } from '@/components/customer/ui';
import { useLastSpeedTestResult } from '@/hooks/useLastSpeedTestResult';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

type LiveSpeedBarProps = {
  isActive: boolean;
  planSpeedMbps: number;
  onPress: () => void;
};

export function LiveSpeedBar({ isActive, planSpeedMbps, onPress }: LiveSpeedBarProps) {
  const styles = useThemedStyles(createStyles);
  const { result: lastResult } = useLastSpeedTestResult();

  const progress =
    lastResult && isActive && planSpeedMbps > 0
      ? Math.min(lastResult.download / planSpeedMbps, 1)
      : 0;

  const card = (
    <GlassCard style={styles.card} padded contentStyle={styles.cardContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Speed</Text>
        {isActive ? (
          <Text style={styles.hint}>Tap to test</Text>
        ) : (
          <CustomerBadge label="Coming soon" tone="neutral" style={styles.comingSoonBadge} />
        )}
      </View>

      {lastResult && isActive ? (
        <>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <View style={styles.metrics}>
            <Text style={styles.metric}>
              <Text style={styles.metricValue}>{lastResult.download}</Text> Mbps ↓
            </Text>
            <Text style={styles.metric}>
              <Text style={styles.metricValue}>{lastResult.upload}</Text> Mbps ↑
            </Text>
            <Text style={styles.metric}>
              <Text style={styles.metricValue}>{lastResult.ping}</Text> ms
            </Text>
          </View>
          <Text style={styles.timestamp}>
            Last tested {lastResult.timestamp.toLocaleTimeString('en-IN')}
          </Text>
        </>
      ) : (
        <Text style={styles.prompt}>
          {isActive ? 'Tap to run a real speed test' : 'Speed test available when your plan is active'}
        </Text>
      )}
    </GlassCard>
  );

  if (!isActive) {
    return (
      <View accessibilityLabel="Live speed, coming soon" style={styles.disabledWrap}>
        {card}
      </View>
    );
  }

  return (
    <PressableScale onPress={onPress} accessibilityLabel="Live speed, tap to test">
      {card}
    </PressableScale>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    disabledWrap: {
      opacity: 0.72,
    },
    card: {
      borderRadius: theme.radius.lg,
    },
    cardContent: {
      gap: theme.spacing.sm,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      ...theme.typography.bodyLg,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
    },
    hint: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontFamily: theme.fonts.bodyMedium,
    },
    comingSoonBadge: {
      flexShrink: 0,
    },
    track: {
      height: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceContainerHigh,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary,
    },
    metrics: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
      alignItems: 'center',
    },
    metric: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
    metricValue: {
      color: theme.colors.primary,
      fontFamily: theme.fonts.monoBold,
      fontWeight: '700',
    },
    timestamp: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.body,
      marginTop: theme.spacing.xs,
    },
    prompt: {
      ...theme.typography.caption,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      marginTop: theme.spacing.xs,
    },
  });

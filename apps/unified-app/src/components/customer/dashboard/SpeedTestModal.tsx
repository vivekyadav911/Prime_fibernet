import { useEffect, useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FullScreenModalShell } from '@/components/common';
import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { CustomerButton } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useSpeedTest } from '@/hooks/useSpeedTest';
import type { SpeedTestResult } from '@/types/speedTest';
import type { CustomerTheme } from '@/theme/customer';

import { SpeedTestGauge } from './SpeedTestGauge';

export type SpeedTestRaiseTicketParams = {
  prefillCategory: 'speed_issue';
  prefillDescription: string;
};

type SpeedTestModalProps = {
  visible: boolean;
  isActive: boolean;
  planSpeedMbps: number;
  onClose: () => void;
  onComplete?: (result: SpeedTestResult) => void;
  onRaiseTicket?: (params: SpeedTestRaiseTicketParams) => void;
};

function MetricTile({ label, value, icon }: { label: string; value: string; icon: string }) {
  const styles = useThemedStyles(createMetricStyles);
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.icon}>{icon}</Text>
    </View>
  );
}

export function SpeedTestModal({
  visible,
  isActive,
  planSpeedMbps,
  onClose,
  onComplete,
  onRaiseTicket,
}: SpeedTestModalProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();
  const { state, runTest, reset, isRunning } = useSpeedTest(planSpeedMbps);
  const { phase, progress, currentSpeed, result, error } = state;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const maxSpeedMbps = Math.max(planSpeedMbps * 1.2, 10);
  const displaySpeed =
    phase === 'idle' ? null : phase === 'complete' && result ? result.download : currentSpeed > 0 ? currentSpeed : null;

  const showBelowPlanWarning = result != null && planSpeedMbps > 0 && result.download < planSpeedMbps * 0.7;
  const planSpeedSummary =
    result == null || planSpeedMbps <= 0
      ? null
      : showBelowPlanWarning
        ? ' — below expected range'
        : result.download >= planSpeedMbps
          ? ' — meets or exceeds plan (edge test)'
          : ' — within expected range';

  useEffect(() => {
    if (!visible) reset();
  }, [reset, visible]);

  useEffect(() => {
    if (result) onComplete?.(result);
  }, [onComplete, result]);

  useEffect(() => {
    if (isRunning) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    return undefined;
  }, [isRunning, pulseAnim]);

  const progressFillStyle = useMemo(
    () => [styles.progressFill, { width: `${Math.round(progress)}%` as `${number}%` }],
    [progress, styles.progressFill],
  );

  const progressFillColorStyle = useMemo(() => {
    const color =
      phase === 'upload'
        ? theme.colors.accentSuccess
        : phase === 'error'
          ? theme.colors.accentDanger
          : theme.colors.primary;
    return [styles.progressFillColor, { backgroundColor: color }];
  }, [phase, styles.progressFillColor, theme.colors]);

  const handleRaiseTicket = () => {
    if (!result || !onRaiseTicket) return;
    const date = result.timestamp.toLocaleDateString('en-IN');
    onRaiseTicket({
      prefillCategory: 'speed_issue',
      prefillDescription:
        `Speed test result on ${date}:\n` +
        `Download: ${result.download} Mbps (plan: ${planSpeedMbps} Mbps)\n` +
        `Upload: ${result.upload} Mbps\n` +
        `Ping: ${result.ping} ms\n` +
        `Jitter: ${result.jitter} ms\n` +
        `Server: ${result.server}\n` +
        `Please investigate.`,
    });
  };

  return (
    <FullScreenModalShell visible={visible} title="Speed Test" onCancel={onClose} onRequestClose={onClose}>
      <View style={styles.shellBody}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!isActive ? (
          <Text style={styles.inactiveNote}>
            Your service is inactive. Speed tests are available when your connection is active.
          </Text>
        ) : null}

        <SpeedTestGauge
          phase={phase}
          displaySpeed={displaySpeed}
          maxSpeedMbps={maxSpeedMbps}
          pulseAnim={pulseAnim}
        />

        {isRunning ? (
          <View style={styles.progressBar}>
            <View style={[progressFillStyle, progressFillColorStyle]} />
          </View>
        ) : null}

        <View style={styles.metricsRow}>
          <MetricTile
            label="Download"
            value={result ? `${result.download} Mbps` : phase === 'idle' ? '—' : isRunning && phase === 'download' ? '…' : '—'}
            icon="↓"
          />
          <MetricTile
            label="Upload"
            value={
              result
                ? `${result.upload} Mbps`
                : phase === 'idle'
                  ? '—'
                  : phase === 'upload'
                    ? `${currentSpeed.toFixed(1)}…`
                    : '—'
            }
            icon="↑"
          />
        </View>
        <View style={styles.metricsRow}>
          <MetricTile label="Ping" value={result ? `${result.ping} ms` : '—'} icon="◎" />
          <MetricTile label="Jitter" value={result ? `${result.jitter} ms` : '—'} icon="〜" />
        </View>

        {result ? (
          <View style={styles.serverInfo}>
            <Text style={styles.serverText}>Server: {result.server}</Text>
            <Text style={styles.serverText}>
              Plan speed: {planSpeedMbps} Mbps
              {planSpeedSummary ?? ''}
            </Text>
            <Text style={styles.timestampText}>
              Tested at {result.timestamp.toLocaleTimeString('en-IN')}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.disclaimer}>
          Measures connection to Supabase Edge (nearest region). Results may differ from dedicated ISP line tests.
        </Text>
        </ScrollView>

        <View style={styles.footer}>
        {phase === 'idle' || phase === 'complete' || phase === 'error' ? (
          <CustomerButton
            label={phase === 'complete' ? 'Run Again' : phase === 'error' ? 'Retry' : 'Start Speed Test'}
            onPress={runTest}
            disabled={!isActive}
            icon="speedometer"
          />
        ) : (
          <CustomerButton label="Stop Test" onPress={reset} variant="outline" icon="stop" />
        )}

        {showBelowPlanWarning && onRaiseTicket ? (
          <CustomerButton
            label="Raise Speed Issue Ticket"
            onPress={handleRaiseTicket}
            variant="ghost"
            icon="ticket-outline"
          />
        ) : null}
        </View>
      </View>
    </FullScreenModalShell>
  );
}

const createMetricStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    tile: {
      flex: 1,
      backgroundColor: theme.colors.surfaceContainerLow,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      gap: theme.spacing.xs,
    },
    label: {
      ...theme.typography.caption,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.bodyMedium,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    value: {
      ...theme.typography.monoMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.monoBold,
    },
    icon: {
      ...theme.typography.body,
      color: theme.colors.primary,
      fontFamily: theme.fonts.body,
    },
  });

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    shellBody: {
      flex: 1,
    },
    content: {
      paddingHorizontal: theme.spacing.marginMobile,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
      gap: theme.spacing.lg,
    },
    inactiveNote: {
      ...theme.typography.body,
      color: theme.colors.accentWarning,
      fontFamily: theme.fonts.body,
      textAlign: 'center',
    },
    progressBar: {
      width: '70%',
      height: 4,
      alignSelf: 'center',
      backgroundColor: theme.colors.surfaceContainerHigh,
      borderRadius: theme.radius.sm,
      overflow: 'hidden',
    },
    progressFill: {
      height: 4,
      borderRadius: theme.radius.sm,
    },
    progressFillColor: {},
    metricsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    serverInfo: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: theme.radius.md,
      gap: theme.spacing.xs,
    },
    serverText: {
      ...theme.typography.caption,
      color: theme.colors.onPrimaryContainer,
      fontFamily: theme.fonts.body,
      lineHeight: 18,
    },
    timestampText: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.body,
      marginTop: theme.spacing.xs,
    },
    errorBox: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorContainer,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.accentDanger,
    },
    errorText: {
      ...theme.typography.body,
      color: theme.colors.accentDanger,
      fontFamily: theme.fonts.body,
    },
    disclaimer: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.body,
      textAlign: 'center',
      lineHeight: 18,
    },
    footer: {
      paddingHorizontal: theme.spacing.marginMobile,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
  });

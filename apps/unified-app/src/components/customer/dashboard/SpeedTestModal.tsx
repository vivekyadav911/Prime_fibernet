import { useEffect } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { CustomerButton } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

import { SpeedGauge } from './SpeedGauge';
import { useSimulatedSpeedTest, type SpeedTestResult } from './useSimulatedSpeedTest';

type SpeedTestModalProps = {
  visible: boolean;
  isActive: boolean;
  planSpeedMbps: number;
  onClose: () => void;
  onComplete?: (result: SpeedTestResult) => void;
};

function MetricTile({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createMetricStyles);
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function SpeedTestModal({
  visible,
  isActive,
  planSpeedMbps,
  onClose,
  onComplete,
}: SpeedTestModalProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();
  const { phase, displaySpeed, result, runTest, reset, isRunning } = useSimulatedSpeedTest(planSpeedMbps);

  useEffect(() => {
    if (!visible) reset();
  }, [reset, visible]);

  useEffect(() => {
    if (result) onComplete?.(result);
  }, [onComplete, result]);

  const gaugeSpeed = isRunning || phase === 'complete' ? displaySpeed : isActive ? planSpeedMbps : null;
  const showPlanNote = phase !== 'complete' && isActive;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.canvas, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
        <View style={styles.header}>
          <CustomerButton label="Close" variant="ghost" onPress={onClose} />
          <Text style={styles.title}>Speed Test</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!isActive ? (
            <Text style={styles.inactiveNote}>
              Your service is inactive. Speed tests are available when your connection is active.
            </Text>
          ) : null}

          <View style={styles.gaugeWrap}>
            <SpeedGauge
              speedMbps={gaugeSpeed}
              maxSpeedMbps={planSpeedMbps > 0 ? planSpeedMbps : 500}
              isActive={isActive}
            />
          </View>

          {showPlanNote ? (
            <Text style={styles.planNote}>
              Plan speed: {planSpeedMbps} Mbps — run a test to measure your connection.
            </Text>
          ) : null}

          <View style={styles.metricsRow}>
            <MetricTile
              label="Download"
              value={result ? `${result.downloadMbps} Mbps` : isRunning ? `${displaySpeed} Mbps` : '—'}
            />
            <MetricTile
              label="Upload"
              value={result ? `${result.uploadMbps} Mbps` : '—'}
            />
          </View>
          <View style={styles.metricsRow}>
            <MetricTile label="Ping" value={result ? `${result.pingMs} ms` : '—'} />
            <MetricTile label="Jitter" value={result ? `${result.jitterMs} ms` : '—'} />
          </View>

          {phase === 'complete' && result ? (
            <Text style={styles.completeNote}>Test complete — results based on your plan provisioned speed.</Text>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <CustomerButton
            label={isRunning ? 'Testing…' : phase === 'complete' ? 'Run Again' : 'Run Speed Test'}
            onPress={runTest}
            disabled={!isActive || isRunning}
            icon="speedometer"
          />
        </View>
      </View>
    </Modal>
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
    },
    value: {
      ...theme.typography.monoMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.monoBold,
    },
  });

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    canvas: {
      flex: 1,
      backgroundColor: theme.colors.bgDeep,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.marginMobile,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSubtle,
      minHeight: 48,
    },
    title: {
      ...theme.typography.displayMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.display,
    },
    headerSpacer: {
      width: 72,
    },
    content: {
      paddingHorizontal: theme.spacing.marginMobile,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
      gap: theme.spacing.lg,
    },
    gaugeWrap: {
      alignItems: 'center',
    },
    planNote: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      textAlign: 'center',
    },
    inactiveNote: {
      ...theme.typography.body,
      color: theme.colors.accentWarning,
      fontFamily: theme.fonts.body,
      textAlign: 'center',
    },
    metricsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    completeNote: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.body,
      textAlign: 'center',
    },
    footer: {
      paddingHorizontal: theme.spacing.marginMobile,
      paddingTop: theme.spacing.sm,
    },
  });

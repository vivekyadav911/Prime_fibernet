import { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';

import type { SendProgress } from '@/types/notifications';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type SendProgressModalProps = {
  visible: boolean;
  progress: SendProgress | null;
};

export function SendProgressModal({ visible, progress }: SendProgressModalProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress?.percent ?? 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress?.percent, anim]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Sending notification...</Text>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { width }]} />
          </View>
          <Text style={styles.percent}>{progress?.percent ?? 0}%</Text>
          <Text style={styles.sub}>
            Sending to {progress?.total ?? 0} recipients...
          </Text>
          <Text style={styles.counts}>
            {progress?.sent ?? 0} sent • {progress?.failed ?? 0} failed
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  track: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#4F46E5' },
  percent: { fontSize: 14, fontWeight: '600', marginTop: spacing.sm, color: colors.textPrimary },
  sub: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.sm },
  counts: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs },
});

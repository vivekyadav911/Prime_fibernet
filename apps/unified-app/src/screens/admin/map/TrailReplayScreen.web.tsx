import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { Screen } from '@prime/ui';

import { useGetLocationHistoryQuery, useGetOfficerDwellsQuery } from '@/services/api/officerTrackingApi';
import type { AdminMapStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<AdminMapStackParamList, 'TrailReplay'>;

const REPLAY_BASE_MS = 500;
const SPEEDS = [1, 10, 60, 600] as const;

/** Web: trail replay without native map — shows point list + scrubber. */
export function TrailReplayScreen({ route, navigation }: Props) {
  const { officerId, officerName, date, timeRange } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);

  const { data: points = [] } = useGetLocationHistoryQuery({ officerId, date, timeRange });
  const { data: dwells = [] } = useGetOfficerDwellsQuery({ date, officerId });

  const current = points[currentIndex];
  const speedMultiplier = SPEEDS[speedIdx] ?? 1;

  useEffect(() => {
    if (!isPlaying || points.length === 0) return undefined;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= points.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, REPLAY_BASE_MS / speedMultiplier);
    return () => clearInterval(interval);
  }, [isPlaying, points.length, speedMultiplier]);

  const togglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>{officerName}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>

      {current ? (
        <View style={styles.currentCard}>
          <Text style={styles.currentTime}>{format(new Date(current.recorded_at), 'hh:mm a')}</Text>
          <Text style={styles.currentCoords}>
            {current.latitude.toFixed(5)}, {current.longitude.toFixed(5)}
          </Text>
          <Text style={styles.currentMeta}>
            Point {currentIndex + 1} of {points.length} · {dwells.length} dwells
          </Text>
        </View>
      ) : (
        <Text style={styles.empty}>No trail points for this period</Text>
      )}

      <View style={styles.controls}>
        <View style={styles.transport}>
          <Pressable onPress={() => setCurrentIndex(0)} style={styles.btn}>
            <Text style={styles.btnText}>◀◀</Text>
          </Pressable>
          <Pressable onPress={togglePlay} style={[styles.btn, styles.playBtn]}>
            <Text style={styles.playText}>{isPlaying ? '⏸ Pause' : '▶ Play'}</Text>
          </Pressable>
          <Pressable
            onPress={() => setCurrentIndex((i) => Math.min(points.length - 1, i + 10))}
            style={styles.btn}
          >
            <Text style={styles.btnText}>▶▶</Text>
          </Pressable>
          <Pressable
            onPress={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
            style={styles.speedBtn}
          >
            <Text style={styles.speedText}>Speed: {speedMultiplier}×</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={points}
        keyExtractor={(p, i) => `${p.recorded_at}-${i}`}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => setCurrentIndex(index)}
            style={[styles.pointRow, index === currentIndex && styles.pointRowActive]}
          >
            <Text style={styles.pointTime}>{format(new Date(item.recorded_at), 'hh:mm a')}</Text>
            <Text style={styles.pointCoords}>
              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    gap: spacing.sm,
  },
  back: { color: adminColors.primary, fontWeight: '600', fontSize: 14 },
  title: { flex: 1, fontWeight: '700', fontSize: 14, color: colors.textPrimary },
  date: { fontSize: 12, color: colors.textSecondary },
  currentCard: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: adminColors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xxs,
  },
  currentTime: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  currentCoords: { fontSize: 13, color: colors.textSecondary },
  currentMeta: { fontSize: 12, color: colors.textSecondary },
  empty: { textAlign: 'center', padding: spacing.xl, color: colors.textSecondary },
  controls: {
    padding: spacing.md,
    backgroundColor: colors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
  },
  transport: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  btn: { padding: spacing.sm },
  btnText: { fontSize: 16, color: colors.textPrimary },
  playBtn: {
    flex: 1,
    backgroundColor: adminColors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  playText: { color: colors.white, fontWeight: '700' },
  speedBtn: { padding: spacing.sm },
  speedText: { fontSize: 13, color: adminColors.primary, fontWeight: '600' },
  pointRow: {
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  pointRowActive: { backgroundColor: adminColors.cardBg },
  pointTime: { fontWeight: '600', color: colors.textPrimary },
  pointCoords: { fontSize: 12, color: colors.textSecondary },
});

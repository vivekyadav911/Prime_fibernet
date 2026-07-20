import { AdminScreenLayout } from '@/components/admin';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';

import {
  LeafletMapView,
  type LeafletCircle,
  type LeafletPin,
  type LeafletPolyline,
} from '@/components/map/LeafletMapView';
import {
  MAP_THEME,
  getOfficerColor,
  getOfficerInitials,
  getTrailColorForSpeed,
} from '@/constants/mapTheme';
import { useGetLocationHistoryQuery, useGetOfficerDwellsQuery } from '@/services/api/officerTrackingApi';
import type { AdminMapStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<AdminMapStackParamList, 'TrailReplay'>;

const REPLAY_BASE_MS = 500;
const SPEEDS = [1, 10, 60, 600] as const;

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

  const replayPoints = useMemo(() => points.slice(0, currentIndex + 1), [points, currentIndex]);

  const color = getOfficerColor(officerName);
  const initials = getOfficerInitials(officerName);

  // Speed-coloured trail segments (same banding as the old react-native-maps polyline).
  const trailSegments = useMemo<LeafletPolyline[]>(() => {
    const segments: LeafletPolyline[] = [];
    let seg: LeafletPolyline | null = null;
    for (let i = 1; i < replayPoints.length; i += 1) {
      const prev = replayPoints[i - 1]!;
      const curr = replayPoints[i]!;
      const segColor = getTrailColorForSpeed(curr.speed);
      const dashed = (curr.speed ?? 0) < 0.5;
      const coord = { latitude: curr.latitude, longitude: curr.longitude };
      if (seg && seg.color === segColor && seg.dashed === dashed) {
        seg.points.push(coord);
      } else {
        if (seg) segments.push(seg);
        seg = {
          id: `seg-${segments.length}`,
          color: segColor,
          dashed,
          points: [{ latitude: prev.latitude, longitude: prev.longitude }, coord],
        };
      }
    }
    if (seg) segments.push(seg);
    return segments;
  }, [replayPoints]);

  const dwellCircles = useMemo<LeafletCircle[]>(
    () =>
      dwells.map((d) => ({
        id: d.id,
        latitude: d.latitude,
        longitude: d.longitude,
        radius: d.radius_metres,
        color: MAP_THEME.dwellStroke,
        fillColor: MAP_THEME.dwellStroke,
        fillOpacity: 0.15,
      })),
    [dwells],
  );

  const mapPins = useMemo<LeafletPin[]>(() => {
    const pins: LeafletPin[] = dwells
      .filter((d) => d.duration_minutes != null || !d.departed_at)
      .map((d) => ({
        id: `dwell-${d.id}`,
        latitude: d.latitude,
        longitude: d.longitude,
        kind: 'pill' as const,
        label: d.duration_minutes != null ? `${d.duration_minutes}m` : '…',
        color: MAP_THEME.dwellStroke,
      }));
    if (current) {
      pins.push({
        id: 'officer',
        latitude: current.latitude,
        longitude: current.longitude,
        kind: 'avatar',
        label: initials,
        color,
      });
    }
    return pins;
  }, [color, current, dwells, initials]);

  const togglePlay = useCallback(() => {
    if (currentIndex >= points.length - 1) setCurrentIndex(0);
    setIsPlaying((p) => !p);
  }, [currentIndex, points.length]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `Trail — ${officerName}`,
    });
  }, [navigation, officerName]);

  return (
    <AdminScreenLayout>
      <LeafletMapView
        style={styles.map}
        center={current ? { latitude: current.latitude, longitude: current.longitude } : null}
        zoom={15}
        polylines={trailSegments}
        circles={dwellCircles}
        pins={mapPins}
      />

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
        {current ? (
          <Text style={styles.timeLabel}>
            {format(new Date(current.recorded_at), 'hh:mm a')}
          </Text>
        ) : null}
      </View>
    </AdminScreenLayout>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
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
  timeLabel: { textAlign: 'center', marginTop: spacing.xs, color: colors.textSecondary, fontSize: 13 },
});

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import type MapView from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { Screen } from '@prime/ui';

import { DwellCircle, FreeMapView, TrailPolyline } from '@/components/map';
import { getOfficerColor, getOfficerInitials } from '@/constants/mapTheme';
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
  const mapRef = useRef<MapView>(null);

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

  useEffect(() => {
    if (!current || !mapRef.current) return;
    mapRef.current.animateCamera({
      center: { latitude: current.latitude, longitude: current.longitude },
      zoom: 15,
    });
  }, [current]);

  const replayPoints = useMemo(() => points.slice(0, currentIndex + 1), [points, currentIndex]);

  const initialRegion = useMemo(() => {
    const p = points[0];
    if (!p) {
      return { latitude: -37.8136, longitude: 144.9631, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    }
    return {
      latitude: p.latitude,
      longitude: p.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [points]);

  const color = getOfficerColor(officerName);
  const initials = getOfficerInitials(officerName);

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
    <Screen padded={false} safeAreaTop={false} style={adminScreenStyles.canvas}>
      <FreeMapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
        <TrailPolyline officerId={officerId} points={replayPoints} />
        {dwells.map((d) => (
          <DwellCircle key={d.id} dwell={d} />
        ))}
        {current ? (
          <Marker coordinate={{ latitude: current.latitude, longitude: current.longitude }}>
            <View style={[styles.marker, { backgroundColor: color }]}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
          </Marker>
        ) : null}
      </FreeMapView>

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: colors.white, fontWeight: '700' },
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

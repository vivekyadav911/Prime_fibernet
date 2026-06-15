import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { format } from 'date-fns';
import { Button } from '@prime/ui';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  ActivityBreakdownChart,
  ActivityStatCard,
} from '@/components/map';
import { MAP_THEME } from '@/constants/mapTheme';
import { useGetLocationHistoryQuery } from '@/services/api/officerTrackingApi';
import { useOfficerActivity } from '@/hooks/useOfficerActivity';
import { useOfficerDwells } from '@/hooks/useOfficerDwells';
import type { AdminMapStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { OfficerLocation, TimeRange } from '@/types/map';

type Props = {
  visible: boolean;
  officer: OfficerLocation | null;
  date: string;
  timeRange: TimeRange;
  onClose: () => void;
  navigation: NativeStackNavigationProp<AdminMapStackParamList, 'MapMain'>;
};

export function OfficerActivitySheet({
  visible,
  officer,
  date,
  timeRange,
  onClose,
  navigation,
}: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '90%'], []);

  const officerId = officer?.officer_id ?? null;
  const name = officer?.officer?.name ?? 'Officer';

  const { activity, isLoading: activityLoading } = useOfficerActivity(officerId, date, timeRange);
  const { data: dwells } = useOfficerDwells(date, officerId ?? undefined);
  const { data: historyPoints } = useGetLocationHistoryQuery(
    { officerId: officerId ?? '', date, timeRange },
    { skip: !officerId },
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  useEffect(() => {
    if (visible) sheetRef.current?.expand();
    else sheetRef.current?.close();
  }, [visible]);

  const stats = activity ?? {
    distance_km: 0,
    time_active_minutes: 0,
    stops: 0,
    avg_speed_kmh: 0,
    max_speed_kmh: 0,
    first_ping_at: null,
    last_ping_at: null,
  };

  const officerDwells = (dwells ?? []).filter((d) => d.officer_id === officerId);

  return (
    <BottomSheet
      ref={sheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surfaceWhite }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.subtitle}>Activity Statistics</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        {activityLoading ? (
          <Text style={styles.loading}>Loading stats…</Text>
        ) : (
          <View style={styles.statsGrid}>
            <ActivityStatCard
              icon="📏"
              label="Distance"
              value={`${stats.distance_km} km`}
              backgroundColor={MAP_THEME.statDistance.bg}
              valueColor={MAP_THEME.statDistance.value}
            />
            <ActivityStatCard
              icon="⏱"
              label="Time Active"
              value={`${stats.time_active_minutes}m`}
              backgroundColor={MAP_THEME.statTimeActive.bg}
              valueColor={MAP_THEME.statTimeActive.value}
            />
            <ActivityStatCard
              icon="📍"
              label="Stops"
              value={String(stats.stops)}
              backgroundColor={MAP_THEME.statStops.bg}
              valueColor={MAP_THEME.statStops.value}
            />
            <ActivityStatCard
              icon="⚡"
              label="Avg Speed"
              value={`${stats.avg_speed_kmh} km/h`}
              backgroundColor={MAP_THEME.statAvgSpeed.bg}
              valueColor={MAP_THEME.statAvgSpeed.value}
            />
          </View>
        )}

        {historyPoints && historyPoints.length > 0 ? (
          <ActivityBreakdownChart points={historyPoints} />
        ) : null}

        <Text style={styles.sectionTitle}>Dwell Stops</Text>
        {officerDwells.length === 0 ? (
          <Text style={styles.empty}>No dwell stops recorded</Text>
        ) : (
          officerDwells.map((d) => (
            <Text key={d.id} style={styles.dwellRow}>
              📍 {format(new Date(d.arrived_at), 'HH:mm')}
              {d.departed_at ? ` – ${format(new Date(d.departed_at), 'HH:mm')}` : ' – ongoing'}
              {d.duration_minutes != null ? ` (${d.duration_minutes} min)` : ''}
              {d.address ? ` — ${d.address}` : ''}
            </Text>
          ))
        )}

        <View style={styles.actions}>
          <Button
            label="View Full Trail"
            variant="secondary"
            onPress={() => {
              if (!officer) return;
              onClose();
              navigation.navigate('TrailReplay', {
                officerId: officer.officer_id,
                officerName: name,
                date,
                timeRange,
              });
            }}
          />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  name: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  close: { fontSize: 20, color: colors.textSecondary },
  loading: { color: colors.textSecondary, marginBottom: spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xxs },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  empty: { fontSize: 13, color: colors.textSecondary },
  dwellRow: { fontSize: 13, color: colors.textPrimary, marginBottom: spacing.xs },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
});

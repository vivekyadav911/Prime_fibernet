import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Circle } from 'react-native-maps';
import type MapView from 'react-native-maps';
import type { LongPressEvent, MapPressEvent, Region } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';


import { AdminScreenLayout, RoleGuard, StatusBadge } from '@/components/admin';
import {
  FreeMapView,
  LiveOfficerMarker,
  MapSearchBar,
  SavedPlaceMarker,
  type MapSearchResult,
} from '@/components/map';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  useAllAttendanceToday,
  useGeofences,
  useLiveOfficerLocations,
} from '@/hooks/attendance/useAdminAttendance';
import { useSavedMapPlaces } from '@/hooks/useSavedMapPlaces';
import type { AttendanceRecord, CheckInMethod, Geofence, OfficerLiveLocation } from '@/types/attendance';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';
import { SHOW_SAVED_MAP_PLACES } from '@/constants/attendanceFeatures';
import { formatSyncLabel } from '@/utils/dateUtils';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'LiveAttendance'>;

const PAGE_PADDING = spacing.lg;
const CARD_RADIUS = radius.xl;
const MAP_HEIGHT = 228;
const DOUBLE_TAP_ZOOM_FACTOR = 0.5;
const DEFAULT_MAP_REGION: Region = {
  latitude: 28.6139,
  longitude: 77.209,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

type ChipTone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

const CHIP_TONES: Record<ChipTone, { bg: string; text: string; border: string }> = {
  success: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  warning: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  error: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
  info: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  neutral: { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
  primary: { bg: adminColors.primaryTint, text: adminColors.primary, border: '#C9C2F0' },
};

function formatTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(hours?: number): string {
  if (hours == null || hours <= 0) return '—';
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes > 0) return `${wholeHours}h ${minutes}m`;
  return `${wholeHours}h`;
}

function formatRelativeSync(iso?: string): string {
  return formatSyncLabel(iso).label;
}

function checkInMethodLabel(method: CheckInMethod): string {
  switch (method) {
    case 'geofence_auto':
      return 'Geofence verified';
    case 'manual_inside':
      return 'In zone';
    case 'approved_outside':
      return 'Outside geofence';
    case 'admin_override':
      return 'Admin override';
    default:
      return 'Location validated';
  }
}

function OperationalChip({ label, tone }: { label: string; tone: ChipTone }) {
  const palette = CHIP_TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.chipText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function LivePulse() {
  return (
    <View style={styles.livePulseWrap}>
      <View style={styles.livePulseDot} />
      <Text style={styles.livePulseText}>Live</Text>
    </View>
  );
}

type SummaryProps = {
  checkedIn: number;
  inGeofence: number;
  exceptions: number;
  activeGeofences: number;
  lastSync?: string;
};

function LiveOperationsSummary({
  checkedIn,
  inGeofence,
  exceptions,
  activeGeofences,
  lastSync,
}: SummaryProps) {
  const sync = formatSyncLabel(lastSync);

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <View style={styles.summaryTitleRow}>
          <Text style={styles.summaryTitle}>Today&apos;s Attendance</Text>
          <LivePulse />
        </View>
        <View style={styles.syncColumn}>
          <Text style={[styles.summarySync, sync.isStale && styles.summarySyncStale]}>
            {sync.label}
          </Text>
          {sync.isStale ? <Text style={styles.staleHint}>Data may be stale</Text> : null}
        </View>
      </View>

      <Text style={styles.summaryHelper}>
        Real-time attendance with location validation
      </Text>

      <View style={styles.summaryMetrics}>
        <View style={styles.summaryMetric}>
          <Text style={styles.summaryMetricValue}>{checkedIn}</Text>
          <Text style={styles.summaryMetricLabel}>Checked in</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryMetric}>
          <Text style={[styles.summaryMetricValue, styles.summaryMetricAccent]}>
            {inGeofence}
          </Text>
          <Text style={styles.summaryMetricLabel}>In geofence</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryMetric}>
          <Text
            style={[
              styles.summaryMetricValue,
              exceptions > 0 ? styles.summaryMetricWarning : undefined,
            ]}
          >
            {exceptions}
          </Text>
          <Text style={styles.summaryMetricLabel}>Need review</Text>
        </View>
      </View>

      <View style={styles.summaryFooter}>
        <OperationalChip
          label={activeGeofences > 0 ? `${activeGeofences} active zone${activeGeofences === 1 ? '' : 's'}` : 'No active zones'}
          tone={activeGeofences > 0 ? 'primary' : 'neutral'}
        />
      </View>
    </View>
  );
}

const MAP_EDGE_PADDING = {
  top: 58,
  right: 72,
  bottom: 56,
  left: 12,
};

type MapModuleProps = {
  initialRegion: Region;
  locations: OfficerLiveLocation[];
  geofences: Geofence[];
  geofenceOverlays: ReactNode;
  siteLabel: string;
  lastSync?: string;
  inGeofenceCount: number;
  geofenceActive: boolean;
  savedPlaces: ReturnType<typeof useSavedMapPlaces>['places'];
  onSavePlace: (type: 'home' | 'office', latitude: number, longitude: number) => void;
  onClearPlace: (type: 'home' | 'office') => void;
};

const GeofenceMapModule = memo(function GeofenceMapModule({
  initialRegion,
  locations,
  geofences,
  geofenceOverlays,
  siteLabel,
  lastSync,
  inGeofenceCount,
  geofenceActive,
  savedPlaces,
  onSavePlace,
  onClearPlace,
}: MapModuleProps) {
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region>(initialRegion);
  const lastTapRef = useRef(0);

  const handleRegionChange = useCallback((region: Region) => {
    regionRef.current = region;
  }, []);

  const zoomAtCoordinate = useCallback((latitude: number, longitude: number) => {
    const region = regionRef.current;
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: region.latitudeDelta * DOUBLE_TAP_ZOOM_FACTOR,
        longitudeDelta: region.longitudeDelta * DOUBLE_TAP_ZOOM_FACTOR,
      },
      280,
    );
  }, []);

  const handlePress = useCallback(
    (event: MapPressEvent) => {
      const now = Date.now();
      const { latitude, longitude } = event.nativeEvent.coordinate;
      if (now - lastTapRef.current < 320) {
        zoomAtCoordinate(latitude, longitude);
      }
      lastTapRef.current = now;
    },
    [zoomAtCoordinate],
  );

  const handleLongPress = useCallback(
    (event: LongPressEvent) => {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      const actions: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }> = [
        { text: 'Set as Home', onPress: () => onSavePlace('home', latitude, longitude) },
        { text: 'Set as Office', onPress: () => onSavePlace('office', latitude, longitude) },
      ];
      if (savedPlaces.home) {
        actions.push({
          text: 'Remove Home pin',
          style: 'destructive',
          onPress: () => onClearPlace('home'),
        });
      }
      if (savedPlaces.office) {
        actions.push({
          text: 'Remove Office pin',
          style: 'destructive',
          onPress: () => onClearPlace('office'),
        });
      }
      actions.push({ text: 'Cancel', style: 'cancel' });
      Alert.alert('Save location', 'Pin this spot on the map:', actions);
    },
    [onClearPlace, onSavePlace, savedPlaces.home, savedPlaces.office],
  );

  const flyToSavedPlace = useCallback((type: 'home' | 'office') => {
    const place = savedPlaces[type];
    if (!place) return;
    mapRef.current?.animateToRegion(
      {
        latitude: place.latitude,
        longitude: place.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      300,
    );
  }, [savedPlaces]);

  const pinCenterAs = useCallback(
    (type: 'home' | 'office') => {
      const { latitude, longitude } = regionRef.current;
      onSavePlace(type, latitude, longitude);
    },
    [onSavePlace],
  );

  const handlePlaceButtonPress = useCallback(
    (type: 'home' | 'office') => {
      const label = type === 'home' ? 'Home' : 'Office';
      const saved = savedPlaces[type];
      if (!saved) {
        pinCenterAs(type);
        return;
      }
      Alert.alert(label, `${label} is pinned on the map.`, [
        { text: 'Go to', onPress: () => flyToSavedPlace(type) },
        { text: 'Update pin', onPress: () => pinCenterAs(type) },
        {
          text: 'Remove pin',
          style: 'destructive',
          onPress: () => onClearPlace(type),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [flyToSavedPlace, onClearPlace, pinCenterAs, savedPlaces],
  );

  const flyToSearchResult = useCallback((result: MapSearchResult) => {
    const delta =
      result.kind === 'geofence' ? 0.05 : result.kind === 'address' ? 0.035 : 0.02;
    mapRef.current?.animateToRegion(
      {
        latitude: result.latitude,
        longitude: result.longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      },
      320,
    );
  }, []);

  return (
    <View style={styles.mapModule}>
      <View style={styles.mapClip}>
        <FreeMapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          mapPadding={MAP_EDGE_PADDING}
          scrollEnabled
          zoomEnabled
          zoomTapEnabled
          zoomControlEnabled={Platform.OS === 'android'}
          pitchEnabled={false}
          rotateEnabled={false}
          onRegionChangeComplete={handleRegionChange}
          onLongPress={handleLongPress}
          onPress={handlePress}
        >
          {locations.map((loc, index) => (
            <LiveOfficerMarker key={loc.officerId} location={loc} colorIndex={index} />
          ))}
          {savedPlaces.home ? <SavedPlaceMarker place={savedPlaces.home} /> : null}
          {savedPlaces.office ? <SavedPlaceMarker place={savedPlaces.office} /> : null}
          {geofenceOverlays}
        </FreeMapView>

        <MapSearchBar
          officers={locations}
          geofences={geofences}
          savedPlaces={savedPlaces}
          onSelect={flyToSearchResult}
        />

        <View style={styles.mapOverlayTop} pointerEvents="box-none">
          <View pointerEvents="none">
            <OperationalChip
              label={geofenceActive ? 'Geofence active' : 'Geofence inactive'}
              tone={geofenceActive ? 'success' : 'neutral'}
            />
          </View>
          <View style={styles.mapOverlayTopRight} pointerEvents="box-none">
            {inGeofenceCount > 0 ? (
              <View pointerEvents="none">
                <OperationalChip label={`${inGeofenceCount} in zone`} tone="info" />
              </View>
            ) : null}
          </View>
        </View>

        {SHOW_SAVED_MAP_PLACES ? (
          <View style={styles.mapPlaceActions} pointerEvents="box-none">
            <Pressable
              accessibilityLabel="Home location — tap to pin or go to saved home"
              style={[styles.placeActionBtn, savedPlaces.home && styles.placeActionBtnSaved]}
              onPress={() => handlePlaceButtonPress('home')}
              onLongPress={() => flyToSavedPlace('home')}
            >
              <Text style={styles.placeActionText}>🏠 Home</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Office location — tap to pin or go to saved office"
              style={[styles.placeActionBtn, savedPlaces.office && styles.placeActionBtnSaved]}
              onPress={() => handlePlaceButtonPress('office')}
              onLongPress={() => flyToSavedPlace('office')}
            >
              <Text style={styles.placeActionText}>🏢 Office</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.mapOverlayBottom} pointerEvents="none">
          <Text style={styles.mapSiteLabel} numberOfLines={1}>
            {siteLabel}
          </Text>
          <Text style={styles.mapSyncLabel}>
            {formatRelativeSync(lastSync)} · Long-press map to pin · Double-tap to zoom
          </Text>
        </View>
      </View>
    </View>
  );
});

type KpiStripProps = {
  present: number;
  absent: number;
  late: number;
};

function AttendanceKpiStrip({ present, absent, late }: KpiStripProps) {
  return (
    <View style={styles.kpiStrip}>
      <View style={[styles.kpiCell, styles.kpiCellPresent]}>
        <Text style={[styles.kpiValue, styles.kpiValuePresent]}>{present}</Text>
        <Text style={styles.kpiLabel}>Present</Text>
        <Text style={styles.kpiCaption}>Today</Text>
      </View>
      <View style={styles.kpiDivider} />
      <View style={[styles.kpiCell, styles.kpiCellAbsent]}>
        <Text style={[styles.kpiValue, styles.kpiValueAbsent]}>{absent}</Text>
        <Text style={styles.kpiLabel}>Absent</Text>
        <Text style={styles.kpiCaption}>Today</Text>
      </View>
      <View style={styles.kpiDivider} />
      <View style={[styles.kpiCell, styles.kpiCellLate]}>
        <Text style={[styles.kpiValue, styles.kpiValueLate]}>{late}</Text>
        <Text style={styles.kpiLabel}>Late</Text>
        <Text style={styles.kpiCaption}>Today</Text>
      </View>
    </View>
  );
}

function AttendanceRecordCard({ item }: { item: AttendanceRecord }) {
  const isCompleted = Boolean(item.checkOutTime);
  const isOutsideZone = item.checkInMethod === 'approved_outside';
  const needsApproval = Boolean(item.approvalRequestId);

  return (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordName}>{item.officerName}</Text>
        <View style={styles.recordChipRow}>
          <StatusBadge status={item.status} />
          {item.isLate ? <OperationalChip label="Late" tone="warning" /> : null}
          {isCompleted ? <OperationalChip label="Completed" tone="success" /> : null}
          {needsApproval ? <OperationalChip label="Pending approval" tone="warning" /> : null}
          {isOutsideZone ? <OperationalChip label="Outside geofence" tone="error" /> : null}
        </View>
      </View>

      <View style={styles.recordTimeRow}>
        <View style={styles.recordTimeCell}>
          <Text style={styles.recordTimeLabel}>Check in</Text>
          <Text style={styles.recordTimeValue}>{formatTime(item.checkInTime)}</Text>
        </View>
        <View style={styles.recordTimeDivider} />
        <View style={styles.recordTimeCell}>
          <Text style={styles.recordTimeLabel}>Check out</Text>
          <Text style={styles.recordTimeValue}>{formatTime(item.checkOutTime)}</Text>
        </View>
        <View style={styles.recordTimeDivider} />
        <View style={styles.recordTimeCell}>
          <Text style={styles.recordTimeLabel}>Duration</Text>
          <Text style={styles.recordTimeValue}>{formatDuration(item.workingHours)}</Text>
        </View>
      </View>

      <View style={styles.recordMetaRow}>
        <Text style={styles.recordMeta} numberOfLines={1}>
          {item.geofenceName || 'Unassigned zone'}
        </Text>
        <Text style={styles.recordMetaDot}>·</Text>
        <Text style={styles.recordMeta} numberOfLines={1}>
          {checkInMethodLabel(item.checkInMethod)}
        </Text>
      </View>

      {item.lateByMinutes != null && item.lateByMinutes > 0 ? (
        <Text style={styles.recordLateNote}>Late by {item.lateByMinutes} min</Text>
      ) : null}
    </View>
  );
}

function RecordsEmptyState({ onAddGeofence }: { onAddGeofence: () => void }) {
  return (
    <View style={styles.recordsEmpty}>
      <Text style={styles.recordsEmptyTitle}>No attendance records yet</Text>
      <Text style={styles.recordsEmptySubtitle}>
        Officer check-ins will appear here in real time as they are validated against active
        geofences.
      </Text>
      <Pressable style={styles.recordsEmptyCta} onPress={onAddGeofence}>
        <Text style={styles.recordsEmptyCtaText}>No active zones — Add a geofence</Text>
      </Pressable>
    </View>
  );
}

export function LiveAttendanceScreen({ navigation }: Props) {
  const { data: locations, refetch: refetchLocations, isLoading: locationsLoading } =
    useLiveOfficerLocations();
  const { data: attendance, isLoading, isError, error, refetch } = useAllAttendanceToday();
  const { data: geofences } = useGeofences();
  const { places: savedPlaces, savePlace, clearPlace } = useSavedMapPlaces();
  const [userRefreshing, setUserRefreshing] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState<string | undefined>();
  const [mapInitialRegion, setMapInitialRegion] = useState<Region | null>(null);
  const mapRegionInitializedRef = useRef(false);

  useEffect(() => {
    if (mapRegionInitializedRef.current) return;

    const first = locations?.[0];
    if (first) {
      mapRegionInitializedRef.current = true;
      setMapInitialRegion({
        latitude: first.coordinates.latitude,
        longitude: first.coordinates.longitude,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      });
      return;
    }

    if (!isLoading && !locationsLoading) {
      mapRegionInitializedRef.current = true;
      setMapInitialRegion(DEFAULT_MAP_REGION);
    }
  }, [locations, isLoading, locationsLoading]);

  useEffect(() => {
    if (!isLoading && !locationsLoading) {
      setLastFetchAt(new Date().toISOString());
    }
  }, [attendance, isLoading, locations, locationsLoading]);

  const counts = useMemo(() => {
    const records = attendance ?? [];
    return {
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => !r.checkInTime).length,
      late: records.filter((r) => r.isLate).length,
    };
  }, [attendance]);

  const opsSummary = useMemo(() => {
    const locs = locations ?? [];
    const records = attendance ?? [];
    const activeGeofences = (geofences ?? []).filter((g) => g.isActive);
    const inGeofence = locs.filter((l) => l.isInsideGeofence).length;
    const checkedIn = records.filter((r) => r.checkInTime).length;
    const exceptions = records.filter((r) => r.approvalRequestId || r.isLate).length;
    const lastSync = [lastFetchAt, ...locs.map((l) => l.lastUpdated)]
      .filter(Boolean)
      .reduce<string | undefined>((latest, ts) => {
        if (!latest || new Date(ts!) > new Date(latest)) return ts;
        return latest;
      }, undefined);

    const siteLabel =
      activeGeofences.length > 0
        ? activeGeofences
            .slice(0, 2)
            .map((g) => g.name)
            .join(' · ')
        : geofences?.[0]?.city
          ? `${geofences[0].city}${geofences[0].state ? `, ${geofences[0].state}` : ''}`
          : 'Monitoring all zones';

    return {
      checkedIn,
      inGeofence,
      exceptions,
      activeGeofences: activeGeofences.length,
      lastSync,
      siteLabel,
      geofenceActive: activeGeofences.length > 0,
    };
  }, [attendance, geofences, lastFetchAt, locations]);

  const renderItem = useCallback(
    ({ item }: { item: AttendanceRecord }) => <AttendanceRecordCard item={item} />,
    [],
  );

  const handleRefresh = useCallback(() => {
    setUserRefreshing(true);
    void Promise.all([refetch(), refetchLocations()]).finally(() => {
      setLastFetchAt(new Date().toISOString());
      setUserRefreshing(false);
    });
  }, [refetch, refetchLocations]);

  const geofenceOverlays = useMemo(
    () =>
      (geofences ?? []).map((g) => {
        if (g.geometry.shape !== 'circle') return null;
        return (
          <Circle
            key={g.id}
            center={g.geometry.center}
            radius={g.geometry.radius}
            strokeColor={g.isActive ? adminColors.primary : colors.textSecondary}
            strokeWidth={g.isActive ? 2 : 1}
            fillColor={g.isActive ? 'rgba(91,79,207,0.16)' : 'rgba(150,150,150,0.12)'}
          />
        );
      }),
    [geofences],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <LiveOperationsSummary
          checkedIn={opsSummary.checkedIn}
          inGeofence={opsSummary.inGeofence}
          exceptions={opsSummary.exceptions}
          activeGeofences={opsSummary.activeGeofences}
          lastSync={opsSummary.lastSync}
        />

        {mapInitialRegion ? (
          <GeofenceMapModule
            initialRegion={mapInitialRegion}
            locations={locations ?? []}
            geofences={geofences ?? []}
            geofenceOverlays={geofenceOverlays}
            siteLabel={opsSummary.siteLabel}
            lastSync={opsSummary.lastSync}
            inGeofenceCount={opsSummary.inGeofence}
            geofenceActive={opsSummary.geofenceActive}
            savedPlaces={savedPlaces}
            onSavePlace={savePlace}
            onClearPlace={clearPlace}
          />
        ) : (
          <View style={styles.mapModulePlaceholder} />
        )}

        <AttendanceKpiStrip
          present={counts.present}
          absent={counts.absent}
          late={counts.late}
        />

        <View style={styles.recordsSectionHeader}>
          <Text style={styles.recordsSectionTitle}>Live records</Text>
          <Text style={styles.recordsSectionCount}>
            {(attendance ?? []).length} officer{(attendance ?? []).length === 1 ? '' : 's'}
          </Text>
        </View>
      </View>
    ),
    [
      attendance,
      counts.absent,
      counts.late,
      counts.present,
      geofenceOverlays,
      geofences,
      locations,
      mapInitialRegion,
      opsSummary,
      savePlace,
      clearPlace,
      savedPlaces,
    ],
  );

  if (isLoading) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={8} />
      </AdminScreenLayout>
    );
  }

  if (isError) {
    return (
      <AdminScreenLayout>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </AdminScreenLayout>
    );
  }

  return (
    <RoleGuard requiredPermission="attendance.view">
      <AdminScreenLayout>
        <FlatList
          data={attendance ?? []}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <RecordsEmptyState
              onAddGeofence={() => navigation.navigate('CreateGeofence', {})}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          refreshing={userRefreshing}
          onRefresh={handleRefresh}
        />

        <View style={styles.toolbar}>
          <Pressable
            style={({ pressed }) => [styles.toolbarBtn, pressed && styles.toolbarBtnPressed]}
            onPress={() => navigation.navigate('GeofenceManagement')}
          >
            <Text style={styles.toolbarBtnText}>Geofences</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.toolbarBtn, pressed && styles.toolbarBtnPressed]}
            onPress={() => navigation.navigate('ApprovalRequests')}
          >
            <Text style={styles.toolbarBtnText}>Approvals</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.toolbarBtn, pressed && styles.toolbarBtnPressed]}
            onPress={() => navigation.navigate('AttendanceRecords')}
          >
            <Text style={styles.toolbarBtnText}>Records</Text>
          </Pressable>
        </View>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: PAGE_PADDING,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexGrow: 1,
  },
  listHeader: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },

  summaryCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    flexWrap: 'wrap',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  summarySync: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'right',
  },
  summarySyncStale: {
    color: adminColors.badgePending,
  },
  syncColumn: {
    alignItems: 'flex-end',
    gap: 2,
  },
  staleHint: {
    fontSize: 10,
    fontWeight: '600',
    color: adminColors.badgePending,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryHelper: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  summaryMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    paddingVertical: spacing.sm,
  },
  summaryMetric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryMetricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  summaryMetricAccent: {
    color: adminColors.sectionIconTeal,
  },
  summaryMetricWarning: {
    color: adminColors.badgePending,
  },
  summaryMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.borderDefault,
  },
  summaryFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },

  livePulseWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: adminColors.badgeActive,
  },
  livePulseText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  mapModule: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: adminColors.cardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
  },
  mapModulePlaceholder: {
    height: MAP_HEIGHT,
    borderRadius: CARD_RADIUS,
    backgroundColor: adminColors.cardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
  },
  mapClip: {
    height: MAP_HEIGHT,
    overflow: 'hidden',
    borderRadius: CARD_RADIUS,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlayTop: {
    position: 'absolute',
    top: 58,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mapOverlayTopRight: {
    alignItems: 'flex-end',
  },
  mapPlaceActions: {
    position: 'absolute',
    right: spacing.sm,
    top: '48%',
    gap: spacing.xs,
  },
  placeActionBtn: {
    minWidth: 56,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeActionBtnSaved: {
    borderColor: adminColors.primary,
    backgroundColor: adminColors.primaryTint,
  },
  placeActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  mapOverlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderDefault,
    gap: 2,
  },
  mapSiteLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  mapSyncLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  kpiStrip: {
    flexDirection: 'row',
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
  },
  kpiCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    gap: 2,
  },
  kpiCellPresent: {
    backgroundColor: '#F8FDFB',
  },
  kpiCellAbsent: {
    backgroundColor: '#FEF8F8',
  },
  kpiCellLate: {
    backgroundColor: '#FFFCF5',
  },
  kpiDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderDefault,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  kpiValuePresent: {
    color: adminColors.badgeActive,
  },
  kpiValueAbsent: {
    color: adminColors.badgeBlocked,
  },
  kpiValueLate: {
    color: adminColors.badgePending,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  kpiCaption: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  recordsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: spacing.xxs,
  },
  recordsSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recordsSectionCount: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  recordCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  recordHeader: {
    gap: spacing.xs,
  },
  recordName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  recordChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recordTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  recordTimeCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  recordTimeDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.borderDefault,
  },
  recordTimeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  recordTimeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  recordMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recordMeta: {
    flexShrink: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  recordMetaDot: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  recordLateNote: {
    fontSize: 12,
    fontWeight: '600',
    color: adminColors.badgePending,
  },

  recordsEmpty: {
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  recordsEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  recordsEmptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  recordsEmptyCta: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: adminColors.primaryTint,
    borderWidth: 1,
    borderColor: adminColors.primary,
  },
  recordsEmptyCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: adminColors.primary,
  },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: PAGE_PADDING,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderDefault,
    backgroundColor: adminColors.cardBg,
  },
  toolbarBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: adminColors.dashboard.ctaBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: adminColors.dashboard.ctaBorder,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  toolbarBtnPressed: {
    backgroundColor: adminColors.dashboard.ctaPressedBg,
  },
  toolbarBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: adminColors.primary,
    letterSpacing: 0.15,
  },
});

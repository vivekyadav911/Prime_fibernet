import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Marker, type Region } from 'react-native-maps';
import type MapView from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { RoleGuard } from '@/components/admin';
import {
  DwellCircle,
  FreeMapView,
  GeofenceOverlay,
  MapControlsPanel,
  OfficerCardList,
  OfficerMarker,
  TrailPolyline,
} from '@/components/map';
import { SkeletonLoader } from '@/components/common';
import { useGeofences } from '@/hooks/attendance/useAdminAttendance';
import { useLocationHistory } from '@/hooks/useLocationHistory';
import { useMapControls } from '@/hooks/useMapControls';
import { useOfficerDwells } from '@/hooks/useOfficerDwells';
import { useOfficerLocations } from '@/hooks/useOfficerLocations';
import { OfficerActivitySheet } from '@/screens/admin/map/OfficerActivitySheet';
import { useGetOpenRequestPinsQuery } from '@/store/api/endpoints';
import type { AdminMapStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { OfficerLocation } from '@/types/map';

const DEFAULT_REGION: Region = {
  latitude: -37.8136,
  longitude: 144.9631,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3,
};

const TABLET_BREAKPOINT = 768;
const PANEL_WIDTH = 300;

export function AdminMapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminMapStackParamList, 'MapMain'>>();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const mapRef = useRef<MapView>(null);
  const panelAnim = useRef(new Animated.Value(isTablet ? 0 : PANEL_WIDTH)).current;

  const { locations, isLoading, isError, refetch, livePaused } = useOfficerLocations();
  const allOfficerIds = useMemo(() => locations.map((l) => l.officer_id), [locations]);
  const { controls, dispatch, toggleOfficer, deselectAll, selectAll } = useMapControls(allOfficerIds);

  const visibleOfficerIds = controls.selectedOfficerIds.length > 0
    ? controls.selectedOfficerIds
    : allOfficerIds;

  const visibleOfficers = useMemo(
    () => locations.filter((l) => visibleOfficerIds.includes(l.officer_id)),
    [locations, visibleOfficerIds],
  );

  const officerOptions = useMemo(
    () =>
      locations.map((l) => ({
        id: l.officer_id,
        name: l.officer?.name ?? 'Officer',
      })),
    [locations],
  );

  const { trailsByOfficer } = useLocationHistory(
    visibleOfficerIds,
    controls.selectedDate,
    controls.timeRange,
    controls.showTrails,
  );

  const { data: dwells = [] } = useOfficerDwells(
    controls.selectedDate,
    visibleOfficerIds.length === 1 ? visibleOfficerIds[0] : undefined,
    controls.showDwellTime,
  );

  const filteredDwells = useMemo(() => {
    if (!controls.showDwellTime) return [];
    return dwells.filter((d) => visibleOfficerIds.includes(d.officer_id));
  }, [dwells, controls.showDwellTime, visibleOfficerIds]);

  const { data: geofences = [] } = useGeofences();
  const { data: requests = [] } = useGetOpenRequestPinsQuery(undefined, {
    skip: !controls.showRequests,
  });

  const [selectedOfficer, setSelectedOfficer] = useState<OfficerLocation | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const initialRegion = useMemo((): Region => {
    const first = visibleOfficers[0] ?? locations[0];
    if (!first) return DEFAULT_REGION;
    return {
      latitude: first.latitude,
      longitude: first.longitude,
      latitudeDelta: 0.15,
      longitudeDelta: 0.15,
    };
  }, [visibleOfficers, locations]);

  const openActivitySheet = useCallback((officer: OfficerLocation) => {
    setSelectedOfficer(officer);
    setSheetVisible(true);
  }, []);

  const flyToOfficer = useCallback((officer: OfficerLocation) => {
    mapRef.current?.animateCamera({
      center: { latitude: officer.latitude, longitude: officer.longitude },
      zoom: 14,
    });
    openActivitySheet(officer);
  }, [openActivitySheet]);

  const togglePanel = useCallback(() => {
    const open = !controls.isPanelOpen;
    dispatch({ type: 'SET_PANEL_OPEN', open });
    if (!isTablet) {
      Animated.timing(panelAnim, {
        toValue: open ? 0 : PANEL_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [controls.isPanelOpen, dispatch, isTablet, panelAnim]);

  if (isLoading && locations.length === 0) {
    return (
      <RoleGuard requiredPermission="map.view">
        <Screen padded={false} safeAreaTop={false}>
          <SkeletonLoader rows={3} tall />
        </Screen>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredPermission="map.view">
      <Screen padded={false} safeAreaTop={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Officer Tracking</Text>
          <View style={styles.headerMeta}>
            {isError ? (
              <Pressable onPress={refetch}>
                <Text style={styles.errorBanner}>Tap to retry loading officers</Text>
              </Pressable>
            ) : null}
            {livePaused ? (
              <Text style={styles.liveBanner}>Live updates paused</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.mapWrap}>
            <FreeMapView
              ref={mapRef}
              style={styles.map}
              mapStyle={controls.mapStyle}
              initialRegion={initialRegion}
              showsCompass
              showsScale
              showsUserLocation={false}
            >
              {geofences.filter((g) => g.isActive).map((fence) => (
                <GeofenceOverlay key={fence.id} fence={fence} />
              ))}

              {controls.showTrails
                ? visibleOfficerIds.map((id) => {
                    const pts = trailsByOfficer.get(id);
                    if (!pts?.length) return null;
                    return (
                      <TrailPolyline
                        key={`trail-${id}`}
                        officerId={id}
                        points={pts}
                      />
                    );
                  })
                : null}

              {controls.showDwellTime
                ? filteredDwells.map((d) => <DwellCircle key={d.id} dwell={d} />)
                : null}

              {controls.showOfficers
                ? visibleOfficers.map((o, idx) => (
                    <OfficerMarker
                      key={o.officer_id}
                      officer={o}
                      colorIndex={idx}
                      onPress={() => openActivitySheet(o)}
                    />
                  ))
                : null}

              {controls.showRequests
                ? (requests ?? []).map((r) => (
                    <Marker
                      key={r.requestId}
                      coordinate={{ latitude: r.lat, longitude: r.lng }}
                      title={r.type}
                      pinColor={colors.warningAmber}
                    />
                  ))
                : null}
            </FreeMapView>

            {!isTablet ? (
              <Pressable style={styles.eyeBtn} onPress={togglePanel}>
                <Text style={styles.eyeIcon}>👁️</Text>
              </Pressable>
            ) : null}

            {!isTablet && controls.isPanelOpen ? (
              <Animated.View
                style={[styles.panelOverlay, { transform: [{ translateX: panelAnim }] }]}
              >
                <MapControlsPanel
                  controls={controls}
                  officers={officerOptions}
                  onDateChange={(d) => dispatch({ type: 'SET_DATE', date: d })}
                  onTimeRangeChange={(tr) => dispatch({ type: 'SET_TIME_RANGE', timeRange: tr })}
                  onToggleOfficer={toggleOfficer}
                  onDeselectAll={deselectAll}
                  onSelectAll={selectAll}
                  onShowOfficersChange={(v) => dispatch({ type: 'SET_SHOW_OFFICERS', value: v })}
                  onShowTrailsChange={(v) => dispatch({ type: 'SET_SHOW_TRAILS', value: v })}
                  onShowDwellChange={(v) => dispatch({ type: 'SET_SHOW_DWELL', value: v })}
                  onShowRequestsChange={(v) => dispatch({ type: 'SET_SHOW_REQUESTS', value: v })}
                  onMapStyleChange={(s) => dispatch({ type: 'SET_MAP_STYLE', style: s })}
                  onClose={togglePanel}
                />
              </Animated.View>
            ) : null}
          </View>

          {isTablet ? (
            <View style={styles.sidePanel}>
              <MapControlsPanel
                controls={controls}
                officers={officerOptions}
                onDateChange={(d) => dispatch({ type: 'SET_DATE', date: d })}
                onTimeRangeChange={(tr) => dispatch({ type: 'SET_TIME_RANGE', timeRange: tr })}
                onToggleOfficer={toggleOfficer}
                onDeselectAll={deselectAll}
                onSelectAll={selectAll}
                onShowOfficersChange={(v) => dispatch({ type: 'SET_SHOW_OFFICERS', value: v })}
                onShowTrailsChange={(v) => dispatch({ type: 'SET_SHOW_TRAILS', value: v })}
                onShowDwellChange={(v) => dispatch({ type: 'SET_SHOW_DWELL', value: v })}
                onShowRequestsChange={(v) => dispatch({ type: 'SET_SHOW_REQUESTS', value: v })}
                onMapStyleChange={(s) => dispatch({ type: 'SET_MAP_STYLE', style: s })}
                onClose={() => dispatch({ type: 'SET_PANEL_OPEN', open: false })}
              />
            </View>
          ) : null}
        </View>

        <OfficerCardList officers={visibleOfficers} onSelect={flyToOfficer} />

        {sheetVisible && selectedOfficer ? (
          <OfficerActivitySheet
            visible={sheetVisible}
            officer={selectedOfficer}
            date={controls.selectedDate}
            timeRange={controls.timeRange}
            onClose={() => setSheetVisible(false)}
            navigation={navigation}
          />
        ) : null}
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  headerMeta: { alignItems: 'flex-end', gap: 2 },
  errorBanner: { fontSize: 12, color: colors.errorRed, fontWeight: '600' },
  liveBanner: { fontSize: 12, color: colors.warningAmber, fontWeight: '600' },
  body: { flex: 1, flexDirection: 'row' },
  mapWrap: { flex: 1, position: 'relative' },
  map: { flex: 1, minHeight: 280 },
  eyeBtn: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  eyeIcon: { fontSize: 20 },
  panelOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  sidePanel: { width: PANEL_WIDTH, borderLeftWidth: 1, borderLeftColor: colors.borderDefault },
});

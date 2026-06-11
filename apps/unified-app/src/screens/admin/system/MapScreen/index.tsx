import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Screen } from '@prime/ui';

import { RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetLiveOfficerPinsQuery, useGetOpenRequestPinsQuery } from '@/store/api/endpoints';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type FilterMode = 'officers' | 'requests' | 'both';

const OFFICER_COLORS: Record<string, string> = {
  available: adminColors.badgeActive,
  offline: colors.textSecondary,
  busy: adminColors.badgePending,
};

export function AdminMapScreen() {
  const [filter, setFilter] = useState<FilterMode>('both');
  const [selectedOfficer, setSelectedOfficer] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  const { data: officers, isLoading: oLoad, isError: oErr, error: oError, refetch: oRefetch } = useGetLiveOfficerPinsQuery();
  const { data: requests, isLoading: rLoad, isError: rErr, error: rError, refetch: rRefetch } = useGetOpenRequestPinsQuery();

  const showOfficers = filter === 'officers' || filter === 'both';
  const showRequests = filter === 'requests' || filter === 'both';

  const selectedOfficerData = useMemo(
    () => officers?.find((o) => o.officerId === selectedOfficer),
    [officers, selectedOfficer],
  );
  const selectedRequestData = useMemo(
    () => requests?.find((r) => r.requestId === selectedRequest),
    [requests, selectedRequest],
  );

  if (oLoad || rLoad) return <Screen><SkeletonLoader rows={3} tall /></Screen>;
  if (oErr || rErr) return <Screen><ErrorState message={queryErrorMessage(oError ?? rError)} onRetry={() => { oRefetch(); rRefetch(); }} /></Screen>;

  return (
    <RoleGuard requiredPermission="map.view">
      <Screen padded={false}>
        <View style={styles.filters}>
          {(['officers', 'requests', 'both'] as FilterMode[]).map((f) => (
            <Pressable key={f} style={[styles.chip, filter === f && styles.chipActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </View>
        <MapView
          style={styles.map}
          initialRegion={{ latitude: 28.6139, longitude: 77.209, latitudeDelta: 0.2, longitudeDelta: 0.2 }}
        >
          {showOfficers
            ? (officers ?? []).map((o) => (
                <Marker
                  key={o.officerId}
                  coordinate={{ latitude: o.lat, longitude: o.lng }}
                  title={o.name}
                  pinColor={OFFICER_COLORS[o.status] ?? adminColors.primary}
                  onPress={() => setSelectedOfficer(o.officerId)}
                />
              ))
            : null}
          {showRequests
            ? (requests ?? []).map((r) => (
                <Marker
                  key={r.requestId}
                  coordinate={{ latitude: r.lat, longitude: r.lng }}
                  title={r.type}
                  pinColor={colors.warningAmber}
                  onPress={() => setSelectedRequest(r.requestId)}
                />
              ))
            : null}
        </MapView>
        {selectedOfficerData ? (
          <View style={styles.popup}>
            <Text style={styles.popupTitle}>{selectedOfficerData.name}</Text>
            <Text style={styles.popupMeta}>Status: {selectedOfficerData.status}</Text>
          </View>
        ) : null}
        {selectedRequestData ? (
          <View style={styles.popup}>
            <Text style={styles.popupTitle}>{selectedRequestData.type}</Text>
            <Text style={styles.popupMeta}>Status: {selectedRequestData.status}</Text>
          </View>
        ) : null}
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, minHeight: 400 },
  filters: { flexDirection: 'row', gap: spacing.xs, padding: spacing.sm },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: 20, borderWidth: 1, borderColor: colors.borderDefault },
  chipActive: { borderColor: adminColors.primary, backgroundColor: adminColors.primaryTint },
  chipText: { fontSize: 12, textTransform: 'capitalize', color: colors.textSecondary },
  chipTextActive: { color: adminColors.primary, fontWeight: '600' },
  popup: { position: 'absolute', bottom: spacing.lg, left: spacing.md, right: spacing.md, backgroundColor: colors.surfaceWhite, padding: spacing.md, borderRadius: 12, shadowOpacity: 0.1, elevation: 4 },
  popupTitle: { fontWeight: '700' },
  popupMeta: { color: colors.textSecondary, fontSize: 13 },
});

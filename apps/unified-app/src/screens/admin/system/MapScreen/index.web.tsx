import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';


import { AdminScreenLayout, RoleGuard } from '@/components/admin';
import { AdminTrackingMap } from '@/components/map/AdminTrackingMap.web';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetTrackingOfficerLocationsQuery, useGetOpenRequestPinsQuery } from '@/store/api/endpoints';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type FilterMode = 'officers' | 'requests' | 'both';

export function AdminMapScreen() {
  const [filter, setFilter] = useState<FilterMode>('both');
  const { width, height } = useWindowDimensions();

  const { data: officers, isLoading: oLoad, isError: oErr, error: oError, refetch: oRefetch } =
    useGetTrackingOfficerLocationsQuery(undefined, { pollingInterval: 30_000 });
  const { data: requests, isLoading: rLoad, isError: rErr, error: rError, refetch: rRefetch } =
    useGetOpenRequestPinsQuery();

  const showOfficers = filter === 'officers' || filter === 'both';
  const showRequests = filter === 'requests' || filter === 'both';

  const listData = useMemo(() => {
    const rows: { id: string; title: string; subtitle: string; kind: 'officer' | 'request' }[] = [];
    if (showOfficers) {
      for (const o of officers ?? []) {
        rows.push({
          id: `officer-${o.officer_id}`,
          title: o.officer?.name ?? 'Officer',
          subtitle: `Officer · ${o.is_online ? 'online' : 'offline'} · ${o.latitude.toFixed(4)}, ${o.longitude.toFixed(4)}`,
          kind: 'officer',
        });
      }
    }
    if (showRequests) {
      for (const r of requests ?? []) {
        rows.push({
          id: `request-${r.requestId}`,
          title: r.type,
          subtitle: `Request · ${r.status} · ${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`,
          kind: 'request',
        });
      }
    }
    return rows;
  }, [officers, requests, showOfficers, showRequests]);

  if (oLoad || rLoad) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={3} tall />
      </AdminScreenLayout>
    );
  }
  if (oErr || rErr) {
    return (
      <AdminScreenLayout>
        <ErrorState
          message={queryErrorMessage(oError ?? rError)}
          onRetry={() => {
            oRefetch();
            rRefetch();
          }}
        />
      </AdminScreenLayout>
    );
  }

  return (
    <RoleGuard requiredPermission="map.view">
      <AdminScreenLayout padded={false}>
        <View style={styles.root}>
          <View style={styles.mapPane}>
            <AdminTrackingMap
              officers={officers ?? []}
              requests={requests ?? []}
              showOfficers={showOfficers}
              showRequests={showRequests}
            />
          </View>

          <View style={styles.panel}>
            <View style={styles.filters}>
              {(['officers', 'requests', 'both'] as FilterMode[]).map((f) => (
                <Pressable
                  key={f}
                  style={[styles.chip, filter === f && styles.chipActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
                </Pressable>
              ))}
            </View>
            <FlatList
              data={listData}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.empty}>No live pins for the selected filter.</Text>
              }
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          item.kind === 'request' ? colors.warningAmber : adminColors.badgeActive,
                      },
                    ]}
                  />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowMeta}>{item.subtitle}</Text>
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  mapPane: {
    flex: 1.4,
    minHeight: 220,
  },
  panel: {
    flex: 1,
    minHeight: 160,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  chipActive: { borderColor: adminColors.primary, backgroundColor: adminColors.primaryTint },
  chipText: { fontSize: 12, textTransform: 'capitalize', color: colors.textSecondary },
  chipTextActive: { color: adminColors.primary, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.sm, paddingBottom: spacing.md, gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: adminColors.surfaceMuted,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: spacing.xs,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
  rowBody: { flex: 1 },
  rowTitle: { fontWeight: '600', color: colors.textPrimary },
  rowMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
});

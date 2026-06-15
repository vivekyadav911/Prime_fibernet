import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@prime/ui';

import { AdminWebLayout, RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetTrackingOfficerLocationsQuery, useGetOpenRequestPinsQuery } from '@/store/api/endpoints';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type FilterMode = 'officers' | 'requests' | 'both';

const OFFICER_COLORS: Record<string, string> = {
  available: adminColors.badgeActive,
  offline: colors.textSecondary,
  busy: adminColors.badgePending,
};

export function AdminMapScreen() {
  const [filter, setFilter] = useState<FilterMode>('both');

  const { data: officers, isLoading: oLoad, isError: oErr, error: oError, refetch: oRefetch } =
    useGetTrackingOfficerLocationsQuery();
  const { data: requests, isLoading: rLoad, isError: rErr, error: rError, refetch: rRefetch } = useGetOpenRequestPinsQuery();

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

  if (oLoad || rLoad) return <Screen><SkeletonLoader rows={3} tall /></Screen>;
  if (oErr || rErr) return <Screen><ErrorState message={queryErrorMessage(oError ?? rError)} onRetry={() => { oRefetch(); rRefetch(); }} /></Screen>;

  return (
    <RoleGuard requiredPermission="map.view">
      <Screen padded={false}>
        <AdminWebLayout>
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Map view</Text>
            <Text style={styles.noticeBody}>
              Interactive map pins are available in the mobile admin app. On web, live officer and request
              locations are listed below.
            </Text>
          </View>
          <View style={styles.filters}>
            {(['officers', 'requests', 'both'] as FilterMode[]).map((f) => (
              <Pressable key={f} style={[styles.chip, filter === f && styles.chipActive]} onPress={() => setFilter(f)}>
                <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
              </Pressable>
            ))}
          </View>
          <FlatList
            data={listData}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
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
                        item.kind === 'request' ? colors.warningAmber : OFFICER_COLORS.available,
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
        </AdminWebLayout>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: adminColors.primaryTint,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: adminColors.permissionBoxBorder,
  },
  noticeTitle: { fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xxs },
  noticeBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  filters: { flexDirection: 'row', gap: spacing.xs, paddingBottom: spacing.sm },
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
  list: { paddingBottom: spacing.xl, gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceWhite,
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

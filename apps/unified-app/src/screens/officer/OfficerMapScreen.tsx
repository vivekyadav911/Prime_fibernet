import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { OfficerScreen } from '@/components/officer';
import { LeafletMapView } from '@/components/map/LeafletMapView';
import { useOfficerAssignedTickets } from '@/hooks/officer';
import { useOfficerPullToRefresh } from '@/hooks/officer/useOfficerPullToRefresh';
import { useAppSelector } from '@/store/hooks';
import type { PortalTicketItem } from '@/types/portalTicket';
import { getPortalItemCoordinates } from '@/utils/officerPortalCoordinates';
import { officerTicketPriorityRank } from '@/utils/officerTicketFilters';
import { queryErrorMessage } from '@/utils/queryError';

import { MapRequestPin, openMapsNavigation } from './components/MapRequestPin';

const PRIORITY_PIN_COLORS: Record<string, string> = {
  Critical: colors.errorRed,
  High: colors.warningAmber,
  Medium: colors.accentTeal,
  Low: colors.textSecondary,
  P0: colors.errorRed,
  P1: colors.warningAmber,
  P2: colors.accentTeal,
  P3: colors.textSecondary};

type MappedTicketItem = PortalTicketItem & {
  latitude: number;
  longitude: number;
  mapAddress: string;
};

export function OfficerMapScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { items, isLoading, isError, error, refetch } = useOfficerAssignedTickets(user?.id);
  const { refreshControl } = useOfficerPullToRefresh(refetch);

  const withCoords = useMemo<MappedTicketItem[]>(() => {
    return items
      .map((item) => {
        const coords = item.coordinates ?? getPortalItemCoordinates(item);
        if (!coords) return null;
        return { ...item, latitude: coords.latitude, longitude: coords.longitude, mapAddress: coords.address };
      })
      .filter((item): item is MappedTicketItem => item != null)
      .sort((a, b) => officerTicketPriorityRank(a) - officerTicketPriorityRank(b));
  }, [items]);

  const pins = useMemo(
    () =>
      withCoords.map((item) => ({
        id: `${item.kind}-${item.id}`,
        latitude: item.latitude,
        longitude: item.longitude,
        color: PRIORITY_PIN_COLORS[item.priority ?? 'Medium'] ?? colors.primaryNavy,
        title: item.displayNumber,
        subtitle: item.categoryLabel,
      })),
    [withCoords],
  );

  const handleNavigate = useCallback((address: string) => {
    openMapsNavigation(address);
  }, []);

  const keyExtractor = useCallback((item: MappedTicketItem) => `${item.kind}-${item.id}`, []);

  const renderItem = useCallback(
    ({ item }: { item: MappedTicketItem }) => (
      <MapRequestPin
        title={item.displayNumber}
        category={item.categoryLabel}
        address={item.mapAddress || item.customerAddress}
        priority={item.priority ?? 'Medium'}
        onNavigate={handleNavigate}
      />
    ),
    [handleNavigate],
  );

  if (isLoading) {
    return (
      <OfficerScreen onRefresh={refetch}>
        <SkeletonLoader rows={3} tall />
      </OfficerScreen>
    );
  }

  if (isError) {
    return (
      <OfficerScreen onRefresh={refetch}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </OfficerScreen>
    );
  }

  if (withCoords.length === 0) {
    return (
      <OfficerScreen onRefresh={refetch}>
        <EmptyState
          title="No mapped tickets"
          subtitle={
            items.length > 0
              ? 'Assigned tickets need GPS coordinates on the address — contact dispatch if pins are missing.'
              : 'Assigned tickets with GPS coordinates will appear here.'
          }
        />
      </OfficerScreen>
    );
  }

  return (
    <OfficerScreen scrollable={false} padded={false} style={styles.screen}>
      <LeafletMapView style={styles.map} pins={pins} fitToContent />
      <FlatList
        refreshControl={refreshControl}
        data={withCoords}
        keyExtractor={keyExtractor}
        style={styles.list}
        renderItem={renderItem}
      />
    </OfficerScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  map: { height: 280 },
  list: { flex: 1 },
});

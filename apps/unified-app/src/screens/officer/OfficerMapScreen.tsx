import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Screen } from '@prime/ui';
import { colors } from '@/theme/colors';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { FreeMapView } from '@/components/map';
import { useOfficerAssignedTickets } from '@/hooks/officer';
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
  P3: colors.textSecondary,
};

type MappedTicketItem = PortalTicketItem & {
  latitude: number;
  longitude: number;
  mapAddress: string;
};

export function OfficerMapScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { items, isLoading, isError, error, refetch } = useOfficerAssignedTickets(user?.id);

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

  const initialRegion = useMemo(() => {
    const first = withCoords[0];
    return {
      latitude: first?.latitude ?? 20.5937,
      longitude: first?.longitude ?? 78.9629,
      latitudeDelta: 0.15,
      longitudeDelta: 0.15,
    };
  }, [withCoords]);

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
      <Screen>
        <SkeletonLoader rows={3} tall />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  if (withCoords.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="No mapped tickets"
          subtitle={
            items.length > 0
              ? 'Assigned tickets need GPS coordinates on the address — contact dispatch if pins are missing.'
              : 'Assigned tickets with GPS coordinates will appear here.'
          }
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FreeMapView style={styles.map} initialRegion={initialRegion}>
        {withCoords.map((item) => (
          <Marker
            key={`${item.kind}-${item.id}`}
            coordinate={{ latitude: item.latitude, longitude: item.longitude }}
            title={item.displayNumber}
            description={item.categoryLabel}
            pinColor={PRIORITY_PIN_COLORS[item.priority ?? 'Medium'] ?? colors.primaryNavy}
          />
        ))}
      </FreeMapView>
      <FlatList
        data={withCoords}
        keyExtractor={keyExtractor}
        style={styles.list}
        renderItem={renderItem}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { height: 280 },
  list: { flex: 1 },
});

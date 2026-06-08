import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import type { ServiceRequest } from '@prime/types';
import { Screen, colors } from '@prime/ui';

import { ErrorState, SkeletonLoader } from '@/components/common';
import { useAppSelector } from '@/store/hooks';
import { useGetAssignedRequestsQuery } from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

import { MapRequestPin, openMapsNavigation } from './components/MapRequestPin';

const PRIORITY_COLORS: Record<string, string> = {
  P0: colors.errorRed,
  P1: colors.warningAmber,
  P2: colors.accentTeal,
  P3: colors.textSecondary,
};

export function OfficerMapScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: requests, isLoading, isError, error, refetch } = useGetAssignedRequestsQuery(user?.id, {
    skip: !user?.id,
  });

  const withCoords = useMemo(() => (requests ?? []).filter((r) => r.address), [requests]);

  const handleNavigate = useCallback((address: string) => {
    openMapsNavigation(address);
  }, []);

  const keyExtractor = useCallback((item: ServiceRequest) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: ServiceRequest }) => (
      <MapRequestPin request={item} onNavigate={handleNavigate} />
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

  return (
    <Screen padded={false}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 28.6139,
          longitude: 77.209,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        }}
      >
        {withCoords.map((req, i) => (
          <Marker
            key={req.id}
            coordinate={{ latitude: 28.6139 + i * 0.02, longitude: 77.209 + i * 0.02 }}
            title={req.requestType}
            description={req.address}
            pinColor={PRIORITY_COLORS[req.priority] ?? colors.primaryNavy}
          />
        ))}
      </MapView>
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

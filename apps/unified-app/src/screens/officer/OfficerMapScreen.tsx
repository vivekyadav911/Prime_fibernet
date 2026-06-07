import { FlatList, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { EmptyState, Screen, StatusChip, colors } from '@prime/ui';

import { useAppSelector } from '@/store/hooks';
import { useGetAssignedRequestsQuery } from '@/store/api/endpoints';

const PRIORITY_COLORS: Record<string, string> = {
  P0: colors.errorRed,
  P1: colors.warningAmber,
  P2: colors.accentTeal,
  P3: colors.textSecondary,
};

export function OfficerMapScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: requests } = useGetAssignedRequestsQuery(user?.id, { skip: !user?.id });

  const withCoords = requests?.filter((r) => r.address) ?? [];

  if (!withCoords.length) {
    return (
      <Screen>
        <EmptyState title="No map pins" description="Assigned requests with addresses will appear here" />
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
        keyExtractor={(item) => item.id}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.capitalize}>{item.requestType}</Text>
              <Text style={styles.address}>{item.address}</Text>
            </View>
            <StatusChip status={item.priority} />
            <Text
              style={styles.navigate}
              onPress={() => {
                const q = encodeURIComponent(item.address);
                const url = Platform.select({
                  ios: `maps:0,0?q=${q}`,
                  android: `geo:0,0?q=${q}`,
                  default: `https://maps.google.com/?q=${q}`,
                });
                if (url) void Linking.openURL(url);
              }}
            >
              Navigate
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { height: 280 },
  list: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: 8 },
  capitalize: { textTransform: 'capitalize', fontWeight: '600' },
  address: { color: colors.textSecondary, fontSize: 12 },
  navigate: { color: colors.accentTeal, fontWeight: '600' },
});

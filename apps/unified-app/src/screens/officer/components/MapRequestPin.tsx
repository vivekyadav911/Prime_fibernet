import React from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import type { ServiceRequest } from '@prime/types';
import { StatusChip } from '@prime/ui';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type MapRequestPinProps = {
  request: ServiceRequest;
  onNavigate: (address: string) => void;
};

export const MapRequestPin = React.memo(function MapRequestPin({ request, onNavigate }: MapRequestPinProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={styles.capitalize}>{request.requestType}</Text>
        <Text style={styles.address}>{request.address}</Text>
      </View>
      <StatusChip status={request.priority} />
      <Text style={styles.navigate} onPress={() => onNavigate(request.address)}>
        Navigate
      </Text>
    </View>
  );
});

export function openMapsNavigation(address: string): void {
  const q = encodeURIComponent(address);
  const url = Platform.select({
    ios: `maps:0,0?q=${q}`,
    android: `geo:0,0?q=${q}`,
    default: `https://maps.google.com/?q=${q}`,
  });
  if (url) void Linking.openURL(url);
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: spacing.xs },
  textCol: { flex: 1 },
  capitalize: { textTransform: 'capitalize', fontWeight: '600' },
  address: { color: colors.textSecondary, fontSize: 12 },
  navigate: { color: colors.accentTeal, fontWeight: '600' },
});

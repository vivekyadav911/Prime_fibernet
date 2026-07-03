import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ServiceRequest } from '@prime/types';
import { StatusChip } from '@prime/ui';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type MapRequestPinProps =
  | {
      request: ServiceRequest;
      onNavigate: (address: string) => void;
    }
  | {
      title: string;
      category: string;
      address: string;
      priority: string;
      onNavigate: (address: string) => void;
    };

export const MapRequestPin = React.memo(function MapRequestPin(props: MapRequestPinProps) {
  const onNavigate = props.onNavigate;
  const title = 'request' in props ? props.request.requestTypeLabel ?? props.request.requestType : props.title;
  const subtitle = 'request' in props ? props.request.address : props.category;
  const address = 'request' in props ? props.request.address : props.address;
  const priority = 'request' in props ? props.request.priority : props.priority;

  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.address} numberOfLines={1}>
          {address}
        </Text>
      </View>
      <StatusChip status={priority} />
      <Pressable onPress={() => onNavigate(address)} hitSlop={8} style={styles.navigateBtn}>
        <Text style={styles.navigate}>Navigate</Text>
      </Pressable>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xs,
    minHeight: 56,
  },
  textCol: { flex: 1 },
  title: { fontWeight: '700', fontSize: 14, color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  address: { color: colors.textSecondary, fontSize: 12 },
  navigateBtn: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.xs },
  navigate: { color: colors.accentTeal, fontWeight: '600' },
});

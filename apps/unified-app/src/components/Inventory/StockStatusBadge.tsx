import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { radius } from '@/theme/spacing';
import type { StockStatus } from '@/types/inventory';
import { getStockStatusConfig } from '@/utils/inventoryUtils';

type StockStatusBadgeProps = {
  status: StockStatus;
};

export function StockStatusBadge({ status }: StockStatusBadgeProps) {
  const config = getStockStatusConfig(status);
  const iconName = config.iconName as keyof typeof Ionicons.glyphMap;

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
      <Ionicons name={iconName} size={12} color={config.textColor} />
      <Text style={[styles.text, { color: config.textColor }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600' },
});

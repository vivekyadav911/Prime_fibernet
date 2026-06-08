import React from 'react';
import { StyleSheet, Text } from 'react-native';
import type { InventoryItem } from '@prime/types';
import { colors } from '@/theme/colors';

type InventoryItemRowProps = {
  item: InventoryItem;
};

export const InventoryItemRow = React.memo(function InventoryItemRow({ item }: InventoryItemRowProps) {
  return (
    <Text style={styles.row}>
      {item.name} · SKU {item.sku ?? '—'} · Qty {item.quantity}
    </Text>
  );
});

const styles = StyleSheet.create({
  row: { paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.borderDefault },
});

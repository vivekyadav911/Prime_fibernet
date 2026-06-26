import { useLayoutEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@prime/ui';

import { StockProgressBar, StockStatusBadge } from '@/components/Inventory';
import { AdminScreenLayout, RoleGuard, SectionCard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useInventoryItem } from '@/hooks/useInventoryItem';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminInventoryStackParamList } from '@/types/navigation';
import { formatCurrency, formatDateTime, truncate } from '@/utils/inventoryUtils';

type Props = NativeStackScreenProps<AdminInventoryStackParamList, 'ItemDetail'>;

type StockQtyRowProps = {
  label: string;
  value: number;
  bgColor: string;
  textColor: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

function StockQtyRow({ label, value, bgColor, textColor, icon }: StockQtyRowProps) {
  return (
    <View style={styles.stockRow}>
      <View style={styles.stockLabelWrap}>
        {icon ? <Ionicons name={icon} size={16} color={textColor} /> : null}
        <Text style={styles.stockLabel}>{label}</Text>
      </View>
      <View style={[styles.qtyBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.qtyBadgeText, { color: textColor }]}>{value}</Text>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function ItemDetailScreen({ navigation, route }: Props) {
  const { itemId } = route.params;
  const { item, isLoading, error } = useInventoryItem(itemId);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: item?.name ? truncate(item.name, 24) : 'Item Details',
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => navigation.navigate('QuickAction', { itemId })}
            hitSlop={8}
            style={styles.headerActionBtn}
          >
            <Ionicons name="flash-outline" size={22} color={colors.white} />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('EditItem', { itemId })}
            hitSlop={8}
            style={styles.headerActionBtn}
          >
            <Ionicons name="create-outline" size={22} color={colors.white} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, itemId, item?.name]);

  if (isLoading) {
    return (
      <RoleGuard requiredPermission="inventory.view">
        <Screen><SkeletonLoader rows={6} /></Screen>
      </RoleGuard>
    );
  }

  if (error || !item) {
    return (
      <RoleGuard requiredPermission="inventory.view">
        <Screen><ErrorState message={error ?? 'Item not found'} onRetry={() => navigation.goBack()} /></Screen>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredPermission="inventory.view">
      <AdminScreenLayout>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.identityCard}>
            <View style={styles.identityHeader}>
              <Text style={styles.itemName}>{item.name}</Text>
              <StockStatusBadge status={item.stockStatus} />
            </View>
            <Text style={styles.sku}>SKU: {item.sku || '—'}</Text>
            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
          </View>

          <SectionCard title="Stock Information">
            <StockQtyRow
              label="Total Quantity"
              value={item.totalQuantity}
              bgColor="#EFF6FF"
              textColor="#3B82F6"
              icon="layers-outline"
            />
            <StockQtyRow
              label="Available"
              value={item.availableQuantity}
              bgColor="#F0FDF4"
              textColor="#10B981"
              icon="checkmark-circle-outline"
            />
            <StockQtyRow
              label="Assigned"
              value={item.assignedQuantity}
              bgColor="#FFFBEB"
              textColor="#F59E0B"
              icon="person-outline"
            />
            <StockQtyRow
              label="Sold"
              value={item.soldQuantity}
              bgColor="#F3F4F6"
              textColor="#6B7280"
              icon="pricetag-outline"
            />
            <StockQtyRow
              label="Damaged"
              value={item.damagedQuantity}
              bgColor="#FEF2F2"
              textColor="#EF4444"
              icon="warning-outline"
            />

            {(item.soldQuantity > 0 || item.damagedQuantity > 0) ? (
              <View style={styles.breakdownBox}>
                <Text style={styles.breakdownTitle}>Stock breakdown</Text>
                <Text style={styles.breakdownText}>
                  {item.availableQuantity} available + {item.assignedQuantity} assigned
                  {item.soldQuantity > 0 ? ` + ${item.soldQuantity} sold` : ''}
                  {item.damagedQuantity > 0 ? ` + ${item.damagedQuantity} damaged` : ''}
                  {' = '}{item.totalQuantity} total
                </Text>
              </View>
            ) : null}

            <StockProgressBar available={item.availableQuantity} total={item.totalQuantity} />
          </SectionCard>

          <SectionCard title="Item Details">
            <DetailRow label="Category" value={item.categoryName} />
            <DetailRow label="Brand" value={item.brand || '—'} />
            <DetailRow label="Model" value={item.model || '—'} />
            <DetailRow label="Status" value={item.status} />
            <DetailRow label="Location" value={item.location || '—'} />
            <DetailRow label="Unit Cost" value={formatCurrency(item.unitCost)} />
            <DetailRow label="Total Value" value={formatCurrency(item.totalValue)} />
          </SectionCard>

          <SectionCard title="Timestamps">
            <DetailRow label="Created" value={formatDateTime(item.createdAt)} />
            <DetailRow label="Last Updated" value={formatDateTime(item.updatedAt)} />
          </SectionCard>
        </ScrollView>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.sm },
  headerActionBtn: { paddingHorizontal: spacing.xs },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  identityCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  identityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  sku: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  description: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stockLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stockLabel: { fontSize: 14, color: colors.textSecondary },
  qtyBadge: { borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 4, minWidth: 40, alignItems: 'center' },
  qtyBadgeText: { fontSize: 14, fontWeight: '700' },
  breakdownBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  breakdownTitle: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  breakdownText: { fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  detailLabel: { fontSize: 14, color: colors.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
});

import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AdminEmptyState } from '@/components/admin';
import type { UpcomingRecharge } from '@/types/api/admin';
import type { RechargeFilter, RechargeSort } from '@/services/api/adminDashboardApi';

import { dash } from '../dashboardUi';
import { DashboardCard } from './ui/DashboardPrimitives';
import { RechargeCustomerRow } from './RechargeCustomerRow';

const FILTER_OPTIONS: { value: RechargeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'under_7', label: '< 7 days' },
  { value: 'under_14', label: '< 14 days' },
];

type UpcomingRechargesSectionProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filter: RechargeFilter;
  onFilterChange: (value: RechargeFilter) => void;
  sort: RechargeSort;
  onToggleSort: () => void;
  recharges: UpcomingRecharge[] | undefined;
  onBulkNotify: () => void;
};

export function UpcomingRechargesSection({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onToggleSort,
  recharges,
  onBulkNotify,
}: UpcomingRechargesSectionProps) {
  const count = recharges?.length ?? 0;
  const urgentCount = recharges?.filter((r) => r.daysRemaining <= 7).length ?? 0;

  const handleBulkNotify = useCallback(() => {
    onBulkNotify();
  }, [onBulkNotify]);

  return (
    <DashboardCard padding={dash.compactPad}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Upcoming Recharges</Text>
          <Text style={styles.subtitle}>
            {count === 0
              ? 'No renewals in this view'
              : `${count} customer${count === 1 ? '' : 's'} · ${urgentCount} due within 7 days`}
          </Text>
        </View>
        <Pressable
          onPress={handleBulkNotify}
          disabled={count === 0}
          style={({ pressed }) => [
            styles.notifyBtn,
            count === 0 && styles.notifyBtnDisabled,
            pressed && count > 0 && styles.notifyBtnPressed,
          ]}
        >
          <Text style={styles.notifyBtnText}>Notify</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={dash.textSecondary} style={styles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search name, email, phone, city…"
          placeholderTextColor={dash.textSecondary}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filters}>
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onFilterChange(opt.value)}
              hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={onToggleSort} hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }} style={styles.sortBtn}>
          <Ionicons name="swap-vertical" size={16} color={dash.brand} />
          <Text style={styles.sortText}>{sort === 'expiry_asc' ? 'Soonest' : 'Latest'}</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {count === 0 ? (
          <AdminEmptyState title="No upcoming recharges" icon="📋" />
        ) : (
          recharges?.map((item, index) => (
            <View key={item.id}>
              <RechargeCustomerRow item={item} />
              {index < count - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))
        )}
      </View>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: dash.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: dash.textSecondary,
    marginTop: 3,
  },
  notifyBtn: {
    height: dash.btnH,
    paddingHorizontal: 18,
    borderRadius: dash.btnRadius,
    backgroundColor: dash.brand,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  notifyBtnPressed: {
    opacity: 0.92,
  },
  notifyBtnDisabled: {
    opacity: 0.4,
  },
  notifyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchWrap: {
    height: dash.searchH,
    borderRadius: dash.radiusSm,
    backgroundColor: dash.searchFill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: dash.text,
    paddingVertical: 0,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    height: dash.chipH,
    paddingHorizontal: 10,
    borderRadius: dash.radiusPill,
    backgroundColor: dash.searchFill,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#ECE9FD',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: dash.textSecondary,
  },
  chipTextActive: {
    color: dash.brand,
    fontWeight: '600',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: dash.chipH,
    paddingHorizontal: 10,
    borderRadius: dash.radiusPill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dash.border,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '600',
    color: dash.brand,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: dash.border,
    paddingTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: dash.border,
  },
});

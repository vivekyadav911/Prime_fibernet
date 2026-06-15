import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SearchBar } from '@/components/admin';
import { officerStrings } from '@/constants/officerStrings';
import type { OfficerAccountStatus } from '@/types/api/admin';

import { ui } from '../officersUi';

type AccountFilter = 'all' | OfficerAccountStatus;

const FILTER_OPTIONS: { value: AccountFilter; label: string }[] = [
  { value: 'all', label: officerStrings.filters.all },
  { value: 'active', label: officerStrings.filters.active },
  { value: 'inactive', label: officerStrings.filters.inactive },
  { value: 'blocked', label: officerStrings.filters.blocked },
];

type OfficerSearchFiltersProps = {
  search: string;
  onSearchChange: (text: string) => void;
  accountStatus: AccountFilter;
  onAccountStatusChange: (value: AccountFilter) => void;
};

export function OfficerSearchFilters({
  search,
  onSearchChange,
  accountStatus,
  onAccountStatusChange,
}: OfficerSearchFiltersProps) {
  return (
    <View style={styles.zone}>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={ui.textSecondary} style={styles.searchIcon} />
        <SearchBar
          value={search}
          onChangeText={onSearchChange}
          placeholder={officerStrings.list.searchPlaceholder}
          debounceMs={400}
          containerStyle={styles.searchBarContainer}
          style={styles.searchInput}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled"
      >
        {FILTER_OPTIONS.map((opt) => {
          const active = accountStatus === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onAccountStatusChange(opt.value)}
              hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    gap: 10,
  },
  searchWrap: {
    height: ui.searchH,
    borderRadius: ui.radiusSm,
    backgroundColor: ui.searchFill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBarContainer: {
    flex: 1,
    height: '100%',
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    padding: 0,
    paddingRight: 28,
    fontSize: 15,
    fontWeight: '500',
    color: ui.text,
    height: ui.searchH,
  },
  chipRow: {
    gap: 8,
    paddingBottom: 2,
  },
  chip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: ui.radiusPill,
    backgroundColor: ui.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#ECE9FD',
    borderColor: '#D8D2F8',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: ui.textSecondary,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: ui.brand,
    fontWeight: '600',
  },
});

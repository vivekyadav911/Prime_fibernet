import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Button } from '@prime/ui';

import { FormField } from '@/components/admin';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { Plan, PlanCategory, PlanFilters } from '@/types/plans';
import { PLAN_CATEGORY_OPTIONS } from '@/types/plans';
import { applyPlanFilters, countActiveFilters } from '@/utils/planUtils';

type PlanFilterSheetProps = {
  visible: boolean;
  filters: PlanFilters;
  allPlans: Plan[];
  onClose: () => void;
  onApply: (filters: Partial<PlanFilters>) => void;
  onClear: () => void;
};

const STATUS_OPTIONS: { value: PlanFilters['status']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const SPEED_PRESETS = [
  { label: '≤25 Mbps', min: 0, max: 25 },
  { label: '26-100', min: 26, max: 100 },
  { label: '101-300', min: 101, max: 300 },
  { label: '300+', min: 301, max: 10000 },
];

const PRICE_PRESETS = [
  { label: 'Under ₹500', min: 0, max: 499 },
  { label: '₹500-₹1000', min: 500, max: 1000 },
  { label: '₹1000-₹2000', min: 1000, max: 2000 },
  { label: '₹2000+', min: 2000, max: 5000 },
];

const VALIDITY_OPTIONS: { label: string; days: number | null }[] = [
  { label: 'Any', days: null },
  { label: '30 Days', days: 30 },
  { label: '60 Days', days: 60 },
  { label: '90 Days', days: 90 },
  { label: '6 Months', days: 180 },
  { label: '1 Year', days: 365 },
];

const SORT_OPTIONS: { value: PlanFilters['sortBy']; label: string }[] = [
  { value: 'sort_order', label: 'Default order' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
  { value: 'speed_asc', label: 'Speed ↑' },
  { value: 'speed_desc', label: 'Speed ↓' },
  { value: 'subscribers', label: 'Most Subscribers' },
];

export function PlanFilterSheet({
  visible,
  filters,
  allPlans,
  onClose,
  onApply,
  onClear,
}: PlanFilterSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['85%'], []);
  const [localFilters, setLocalFilters] = useState<PlanFilters>(filters);

  useEffect(() => {
    if (visible) setLocalFilters(filters);
  }, [visible, filters]);

  const previewCount = useMemo(
    () => applyPlanFilters(allPlans, localFilters).length,
    [allPlans, localFilters],
  );

  const activeCount = useMemo(() => countActiveFilters(localFilters), [localFilters]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  if (!visible) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Filter Plans</Text>

        <Text style={styles.sectionLabel}>Status</Text>
        <View style={styles.chipRow}>
          {STATUS_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.chip, localFilters.status === opt.value ? styles.chipActive : null]}
              onPress={() => setLocalFilters((p) => ({ ...p, status: opt.value }))}
            >
              <Text style={[styles.chipText, localFilters.status === opt.value ? styles.chipTextActive : null]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.chipRow}>
          <Pressable
            style={[styles.chip, localFilters.category === 'all' ? styles.chipActive : null]}
            onPress={() => setLocalFilters((p) => ({ ...p, category: 'all' }))}
          >
            <Text style={[styles.chipText, localFilters.category === 'all' ? styles.chipTextActive : null]}>All</Text>
          </Pressable>
          {PLAN_CATEGORY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.chip, localFilters.category === opt.value ? styles.chipActive : null]}
              onPress={() =>
                setLocalFilters((p) => ({
                  ...p,
                  category: p.category === opt.value ? 'all' : (opt.value as PlanCategory),
                }))
              }
            >
              <Text
                style={[styles.chipText, localFilters.category === opt.value ? styles.chipTextActive : null]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Speed Range (Mbps)</Text>
        <View style={styles.rangeRow}>
          <FormField
            label="Min"
            value={localFilters.speedMin != null ? String(localFilters.speedMin) : ''}
            onChangeText={(v) =>
              setLocalFilters((p) => ({ ...p, speedMin: v ? Number(v) : null }))
            }
            keyboardType="numeric"
            containerStyle={styles.rangeField}
          />
          <FormField
            label="Max"
            value={localFilters.speedMax != null ? String(localFilters.speedMax) : ''}
            onChangeText={(v) =>
              setLocalFilters((p) => ({ ...p, speedMax: v ? Number(v) : null }))
            }
            keyboardType="numeric"
            containerStyle={styles.rangeField}
          />
        </View>
        <View style={styles.chipRow}>
          {SPEED_PRESETS.map((preset) => (
            <Pressable
              key={preset.label}
              style={styles.chip}
              onPress={() =>
                setLocalFilters((p) => ({ ...p, speedMin: preset.min, speedMax: preset.max }))
              }
            >
              <Text style={styles.chipText}>{preset.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Price Range (₹)</Text>
        <View style={styles.rangeRow}>
          <FormField
            label="Min"
            value={localFilters.priceMin != null ? String(localFilters.priceMin) : ''}
            onChangeText={(v) =>
              setLocalFilters((p) => ({ ...p, priceMin: v ? Number(v) : null }))
            }
            keyboardType="numeric"
            containerStyle={styles.rangeField}
          />
          <FormField
            label="Max"
            value={localFilters.priceMax != null ? String(localFilters.priceMax) : ''}
            onChangeText={(v) =>
              setLocalFilters((p) => ({ ...p, priceMax: v ? Number(v) : null }))
            }
            keyboardType="numeric"
            containerStyle={styles.rangeField}
          />
        </View>
        <View style={styles.chipRow}>
          {PRICE_PRESETS.map((preset) => (
            <Pressable
              key={preset.label}
              style={styles.chip}
              onPress={() =>
                setLocalFilters((p) => ({ ...p, priceMin: preset.min, priceMax: preset.max }))
              }
            >
              <Text style={styles.chipText}>{preset.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Validity</Text>
        <View style={styles.chipRow}>
          {VALIDITY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.label}
              style={[styles.chip, localFilters.validityDays === opt.days ? styles.chipActive : null]}
              onPress={() => setLocalFilters((p) => ({ ...p, validityDays: opt.days }))}
            >
              <Text
                style={[
                  styles.chipText,
                  localFilters.validityDays === opt.days ? styles.chipTextActive : null,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Sort By</Text>
        {SORT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={styles.radioRow}
            onPress={() => setLocalFilters((p) => ({ ...p, sortBy: opt.value }))}
          >
            <View style={[styles.radio, localFilters.sortBy === opt.value ? styles.radioOn : null]} />
            <Text style={styles.radioLabel}>{opt.label}</Text>
          </Pressable>
        ))}

        <Text style={styles.preview}>{previewCount} plans will be shown</Text>

        <View style={styles.footer}>
          <Button label="Clear All" variant="ghost" onPress={onClear} />
          <Button
            label={`Apply (${activeCount} filters active)`}
            onPress={() => {
              onApply(localFilters);
              onClose();
            }}
          />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.surfaceWhite },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  chipActive: { backgroundColor: adminColors.primary, borderColor: adminColors.primary },
  chipText: { fontSize: 12, color: colors.textPrimary },
  chipTextActive: { color: colors.surfaceWhite, fontWeight: '600' },
  rangeRow: { flexDirection: 'row', gap: spacing.sm },
  rangeField: { flex: 1 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.borderDefault,
  },
  radioOn: { borderColor: adminColors.primary, backgroundColor: adminColors.primary },
  radioLabel: { fontSize: 14, color: colors.textPrimary },
  preview: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});

import BottomSheet, { BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import type { PlanSortKey } from '../hooks/usePlans';

type SortBottomSheetProps = {
  sortBy: PlanSortKey;
  onSelect: (key: PlanSortKey) => void;
};

const OPTIONS: { key: PlanSortKey; label: string }[] = [
  { key: 'price', label: 'Price (low to high)' },
  { key: 'speed', label: 'Speed (high to low)' },
  { key: 'popularity', label: 'Popularity' },
];

export const SortBottomSheet = forwardRef<BottomSheet, SortBottomSheetProps>(
  function SortBottomSheet({ sortBy, onSelect }, ref) {
    const snapPoints = useMemo(() => ['35%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      [],
    );

    return (
      <BottomSheet ref={ref} index={-1} snapPoints={snapPoints} enablePanDownToClose backdropComponent={renderBackdrop}>
        <View style={styles.content}>
          <Text style={styles.title}>Sort plans</Text>
          {OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              style={[styles.option, sortBy === option.key && styles.optionActive]}
              onPress={() => onSelect(option.key)}
            >
              <Text style={[styles.optionText, sortBy === option.key && styles.optionTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  option: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  optionActive: { borderColor: colors.primaryNavy, backgroundColor: `${colors.primaryNavy}11` },
  optionText: { color: colors.textPrimary, fontSize: 15 },
  optionTextActive: { fontWeight: '700', color: colors.primaryNavy },
});

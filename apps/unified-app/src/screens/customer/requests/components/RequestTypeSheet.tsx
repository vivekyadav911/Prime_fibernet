import BottomSheet, { BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RequestType } from '@prime/types';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const TYPES: { key: RequestType; label: string }[] = [
  { key: 'installation', label: 'New installation' },
  { key: 'repair', label: 'Repair' },
  { key: 'upgrade', label: 'Plan upgrade' },
  { key: 'complaint', label: 'Complaint' },
];

type RequestTypeSheetProps = {
  selected: RequestType;
  onSelect: (type: RequestType) => void;
};

export const RequestTypeSheet = forwardRef<BottomSheet, RequestTypeSheetProps>(
  function RequestTypeSheet({ selected, onSelect }, ref) {
    const snapPoints = useMemo(() => ['40%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      [],
    );

    return (
      <BottomSheet ref={ref} index={-1} snapPoints={snapPoints} enablePanDownToClose backdropComponent={renderBackdrop}>
        <View style={styles.content}>
          <Text style={styles.title}>Request type</Text>
          {TYPES.map((type) => (
            <Pressable
              key={type.key}
              style={[styles.option, selected === type.key && styles.optionActive]}
              onPress={() => onSelect(type.key)}
            >
              <Text style={[styles.optionText, selected === type.key && styles.optionTextActive]}>
                {type.label}
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
  optionText: { color: colors.textPrimary },
  optionTextActive: { fontWeight: '700', color: colors.primaryNavy },
});

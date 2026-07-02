import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';

import { SearchBar } from '@/components/admin';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export type EmployeeSelectorOfficer = {
  id: string;
  full_name: string;
  avatar_url?: string;
};

type EmployeeSelectorSheetProps = {
  visible: boolean;
  officers: EmployeeSelectorOfficer[];
  selectedOfficerId: string | null;
  onClose: () => void;
  onSelect: (id: string | null) => void;
};

export function EmployeeSelectorSheet({
  visible,
  officers,
  selectedOfficerId,
  onClose,
  onSelect,
}: EmployeeSelectorSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['70%'], []);
  const [query, setQuery] = useState('');

  const filteredOfficers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return officers;
    return officers.filter((officer) => officer.full_name.toLowerCase().includes(normalized));
  }, [officers, query]);

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
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Select employee</Text>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search employees…"
          containerStyle={styles.searchBar}
        />

        <Pressable
          accessibilityRole="button"
          style={[styles.row, selectedOfficerId === null && styles.rowActive]}
          onPress={() => {
            onSelect(null);
            onClose();
          }}
        >
          <Text style={[styles.rowText, selectedOfficerId === null && styles.rowTextActive]}>All employees</Text>
        </Pressable>

        {filteredOfficers.map((officer) => {
          const active = selectedOfficerId === officer.id;
          return (
            <Pressable
              key={officer.id}
              accessibilityRole="button"
              style={[styles.row, active && styles.rowActive]}
              onPress={() => {
                onSelect(officer.id);
                onClose();
              }}
            >
              <Text style={[styles.rowText, active && styles.rowTextActive]}>{officer.full_name}</Text>
            </Pressable>
          );
        })}

        {filteredOfficers.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No employees match your search.</Text>
          </View>
        ) : null}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  searchBar: { marginBottom: spacing.sm },
  row: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  rowActive: {
    borderColor: adminColors.primary,
    backgroundColor: adminColors.primaryTint,
  },
  rowText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  rowTextActive: {
    color: adminColors.primary,
    fontWeight: '700',
  },
  emptyWrap: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

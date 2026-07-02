import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import { EmployeeSelectorSheet, type EmployeeSelectorOfficer } from './EmployeeSelectorSheet';

const MAX_INLINE_OFFICERS = 6;

type EmployeeSelectorProps = {
  officers: EmployeeSelectorOfficer[];
  selectedOfficerId: string | null;
  onSelect: (id: string | null) => void;
};

export function EmployeeSelector({ officers, selectedOfficerId, onSelect }: EmployeeSelectorProps) {
  const [sheetVisible, setSheetVisible] = useState(false);

  const sortedOfficers = useMemo(
    () => [...officers].sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [officers],
  );

  const inlineOfficers = sortedOfficers.slice(0, MAX_INLINE_OFFICERS);
  const showMore = sortedOfficers.length > MAX_INLINE_OFFICERS;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Employee</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.row}
      >
        <Chip label="All" active={selectedOfficerId === null} onPress={() => onSelect(null)} />
        {inlineOfficers.map((officer) => (
          <Chip
            key={officer.id}
            label={officer.full_name}
            active={selectedOfficerId === officer.id}
            onPress={() => onSelect(officer.id)}
          />
        ))}
        {showMore ? (
          <Chip label="More…" active={false} onPress={() => setSheetVisible(true)} />
        ) : null}
      </ScrollView>

      <EmployeeSelectorSheet
        visible={sheetVisible}
        officers={sortedOfficers}
        selectedOfficerId={selectedOfficerId}
        onClose={() => setSheetVisible(false)}
        onSelect={onSelect}
      />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xxs },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  scroll: { flexGrow: 0 },
  row: { gap: spacing.xs, paddingVertical: spacing.xxs },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 36,
    justifyContent: 'center',
    backgroundColor: colors.surfaceWhite,
    maxWidth: 180,
  },
  chipActive: {
    borderColor: adminColors.primary,
    backgroundColor: adminColors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
});

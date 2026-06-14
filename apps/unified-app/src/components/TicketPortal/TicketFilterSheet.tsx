import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Button } from '@prime/ui';

import { DateRangePicker } from '@/components/admin';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type {
  ComplaintType,
  TicketFilters,
  TicketPriority,
  TicketStatus,
} from '@/types/tickets';

type TicketFilterSheetProps = {
  visible: boolean;
  filters: TicketFilters;
  onClose: () => void;
  onApply: (filters: Partial<TicketFilters>) => void;
  onClear: () => void;
};

const STATUS_OPTIONS: TicketStatus[] = [
  'Open',
  'In Progress',
  'Awaiting Customer',
  'Awaiting Parts',
  'Resolved',
  'Closed',
  'Reopened',
];

const PRIORITY_OPTIONS: TicketPriority[] = ['Critical', 'High', 'Medium', 'Low'];

const COMPLAINT_OPTIONS: ComplaintType[] = [
  'Technical Issue',
  'Billing Dispute',
  'No Internet',
  'Speed Issue',
  'Other',
];

export function TicketFilterSheet({
  visible,
  filters,
  onClose,
  onApply,
  onClear,
}: TicketFilterSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['75%'], []);
  const [localFilters, setLocalFilters] = useState<TicketFilters>(filters);

  useEffect(() => {
    if (visible) setLocalFilters(filters);
  }, [visible, filters]);

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
        <Text style={styles.title}>Advanced Filters</Text>

        <Text style={styles.sectionLabel}>Status</Text>
        <View style={styles.chipRow}>
          {STATUS_OPTIONS.map((s) => (
            <Pressable
              key={s}
              style={[styles.chip, localFilters.status === s ? styles.chipActive : null]}
              onPress={() => setLocalFilters((p) => ({ ...p, status: p.status === s ? 'All' : s }))}
            >
              <Text style={[styles.chipText, localFilters.status === s ? styles.chipTextActive : null]}>
                {s}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Priority</Text>
        <View style={styles.chipRow}>
          {PRIORITY_OPTIONS.map((p) => (
            <Pressable
              key={p}
              style={[styles.chip, localFilters.priority === p ? styles.chipActive : null]}
              onPress={() =>
                setLocalFilters((prev) => ({ ...prev, priority: prev.priority === p ? 'All' : p }))
              }
            >
              <Text
                style={[styles.chipText, localFilters.priority === p ? styles.chipTextActive : null]}
              >
                {p}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Complaint Type</Text>
        <View style={styles.chipRow}>
          {COMPLAINT_OPTIONS.map((c) => (
            <Pressable
              key={c}
              style={[styles.chip, localFilters.complaintType === c ? styles.chipActive : null]}
              onPress={() =>
                setLocalFilters((prev) => ({
                  ...prev,
                  complaintType: prev.complaintType === c ? 'All' : c,
                }))
              }
            >
              <Text
                style={[
                  styles.chipText,
                  localFilters.complaintType === c ? styles.chipTextActive : null,
                ]}
              >
                {c}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Assignment</Text>
        {(['all', 'assigned', 'unassigned'] as const).map((a) => (
          <Pressable
            key={a}
            style={styles.radioRow}
            onPress={() => setLocalFilters((p) => ({ ...p, assignment: a }))}
          >
            <View style={[styles.radio, localFilters.assignment === a ? styles.radioOn : null]} />
            <Text style={styles.radioLabel}>
              {a === 'all' ? 'All tickets' : a === 'assigned' ? 'Only assigned' : 'Only unassigned'}
            </Text>
          </Pressable>
        ))}

        <Text style={styles.sectionLabel}>SLA</Text>
        {(
          [
            { value: null, label: 'All' },
            { value: true, label: 'Only Breached' },
            { value: false, label: 'Only At Risk (not breached)' },
          ] as const
        ).map(({ value, label }) => (
          <Pressable
            key={label}
            style={styles.radioRow}
            onPress={() => setLocalFilters((p) => ({ ...p, slaBreached: value }))}
          >
            <View
              style={[styles.radio, localFilters.slaBreached === value ? styles.radioOn : null]}
            />
            <Text style={styles.radioLabel}>{label}</Text>
          </Pressable>
        ))}

        <DateRangePicker
          from={localFilters.dateRange.from?.toISOString().slice(0, 10) ?? ''}
          to={localFilters.dateRange.to?.toISOString().slice(0, 10) ?? ''}
          onFromChange={(from) =>
            setLocalFilters((p) => ({
              ...p,
              dateRange: { ...p.dateRange, from: from ? new Date(from) : null },
            }))
          }
          onToChange={(to) =>
            setLocalFilters((p) => ({
              ...p,
              dateRange: { ...p.dateRange, to: to ? new Date(to) : null },
            }))
          }
          accentColor={adminColors.primary}
        />

        <View style={styles.footer}>
          <Button label="Clear All" variant="ghost" onPress={onClear} />
          <Button
            label="Apply Filters"
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
  sheetBg: {
    backgroundColor: colors.surfaceWhite,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  chipActive: {
    backgroundColor: adminColors.primary,
    borderColor: adminColors.primary,
  },
  chipText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  chipTextActive: {
    color: colors.surfaceWhite,
    fontWeight: '600',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.borderDefault,
  },
  radioOn: {
    borderColor: adminColors.primary,
    backgroundColor: adminColors.primary,
  },
  radioLabel: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});

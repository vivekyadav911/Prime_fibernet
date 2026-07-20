import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Button } from '@prime/ui';

import { SelectField } from '@/components/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { CollectionAssignmentsFilters } from '@/types/api/admin';
import { DEFAULT_COLLECTION_ASSIGNMENTS_FILTERS } from '@/types/api/admin';
import type { Officer } from '@prime/types';

type CollectionAssignmentsFilterSheetProps = {
  visible: boolean;
  filters: CollectionAssignmentsFilters;
  officers: Officer[];
  onClose: () => void;
  onApply: (filters: CollectionAssignmentsFilters) => void;
  onClear: () => void;
  /** History tab only needs officer + event status filters. */
  mode?: 'board' | 'history';
};

export function countActiveHistoryFilters(filters: CollectionAssignmentsFilters): number {
  let count = 0;
  if (filters.officerFilter !== 'all') count += 1;
  if (filters.collectionStatus !== 'all') count += 1;
  return count;
}

const PAYMENT_STATUS_OPTIONS = [
  { value: 'all' as const, label: 'All' },
  { value: 'paid' as const, label: 'Paid' },
  { value: 'pending' as const, label: 'Pending' },
  { value: 'overdue' as const, label: 'Overdue' },
  { value: 'suspended' as const, label: 'Suspended' },
];

const COLLECTION_STATUS_OPTIONS = [
  { value: 'all' as const, label: 'All' },
  { value: 'inactive' as const, label: 'Inactive' },
  { value: 'open' as const, label: 'Open pool' },
  { value: 'assigned' as const, label: 'Assigned' },
  { value: 'claimed' as const, label: 'Claimed' },
  { value: 'collected' as const, label: 'Collected' },
];

const CLAIM_OPTIONS = [
  { value: 'all' as const, label: 'All' },
  { value: 'claimed' as const, label: 'Claimed' },
  { value: 'unclaimed' as const, label: 'Unclaimed' },
];

const VIEW_MODE_OPTIONS = [
  { value: 'upcoming' as const, label: 'Upcoming payments' },
  { value: 'due_for_collection' as const, label: 'Due for collection' },
  { value: 'all' as const, label: 'Show all customers' },
];

const BALANCE_OPTIONS = [
  { value: 'all' as const, label: 'All balances' },
  { value: 'outstanding' as const, label: 'Outstanding only' },
];

export function countActiveCollectionFilters(filters: CollectionAssignmentsFilters): number {
  let count = 0;
  if (filters.officerFilter !== 'all') count += 1;
  if (filters.paymentStatus !== 'all') count += 1;
  if (filters.collectionStatus !== 'all') count += 1;
  if (filters.queueView !== 'upcoming') count += 1;
  if (filters.queueView === 'all' && filters.outstandingOnly) count += 1;
  if (filters.claimFilter !== 'all') count += 1;
  return count;
}

export function CollectionAssignmentsFilterSheet({
  visible,
  filters,
  officers,
  onClose,
  onApply,
  onClear,
  mode = 'board',
}: CollectionAssignmentsFilterSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['80%'], []);
  const [localFilters, setLocalFilters] = useState<CollectionAssignmentsFilters>(filters);

  useEffect(() => {
    if (visible) setLocalFilters(filters);
  }, [visible, filters]);

  const officerOptions = useMemo(
    () => [
      { value: 'all' as const, label: 'All customers' },
      { value: 'open_pool' as const, label: 'Open pool' },
      ...officers.map((o) => ({ value: o.id, label: o.name })),
    ],
    [officers],
  );

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
        <Text style={styles.title}>Filters</Text>

        <SelectField
          label={mode === 'history' ? 'Officer' : 'Assigned officer'}
          value={localFilters.officerFilter}
          options={officerOptions}
          onSelect={(value) => setLocalFilters((prev) => ({ ...prev, officerFilter: value }))}
        />

        <SelectField
          label={mode === 'history' ? 'Event status' : 'Collection status'}
          value={localFilters.collectionStatus}
          options={COLLECTION_STATUS_OPTIONS}
          onSelect={(value) => setLocalFilters((prev) => ({ ...prev, collectionStatus: value }))}
        />

        {mode === 'board' ? (
          <>
            <SelectField
              label="Payment status"
              value={localFilters.paymentStatus}
              options={PAYMENT_STATUS_OPTIONS}
              onSelect={(value) => setLocalFilters((prev) => ({ ...prev, paymentStatus: value }))}
            />

            <SelectField
              label="Queue view"
              value={localFilters.queueView}
              options={VIEW_MODE_OPTIONS}
              onSelect={(value) =>
                setLocalFilters((prev) => ({
                  ...prev,
                  queueView: value,
                  outstandingOnly: value === 'due_for_collection' ? true : prev.outstandingOnly,
                }))
              }
            />

            {localFilters.queueView === 'all' ? (
              <SelectField
                label="Balance"
                value={localFilters.outstandingOnly ? 'outstanding' : 'all'}
                options={BALANCE_OPTIONS}
                onSelect={(value) =>
                  setLocalFilters((prev) => ({ ...prev, outstandingOnly: value === 'outstanding' }))
                }
              />
            ) : null}

            <SelectField
              label="Claim state"
              value={localFilters.claimFilter}
              options={CLAIM_OPTIONS}
              onSelect={(value) => setLocalFilters((prev) => ({ ...prev, claimFilter: value }))}
            />
          </>
        ) : null}

        <View style={styles.actions}>
          <Button label="Apply" onPress={() => onApply(localFilters)} />
          <Button
            label="Clear all"
            variant="ghost"
            onPress={() => {
              onClear();
              setLocalFilters(DEFAULT_COLLECTION_ASSIGNMENTS_FILTERS);
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
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});

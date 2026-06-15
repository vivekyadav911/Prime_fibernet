import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Screen } from '@prime/ui';

import {
  AdminEmptyState,
  FilterChips,
  RoleGuard,
  SearchBar,
} from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useCollectionAssignmentsSync } from '@/hooks/admin/useCollectionAssignmentsSync';
import { useGetOfficersQuery } from '@/services/api/officersApi';
import {
  useAssignCollectionOfficerMutation,
  useBulkAssignCollectionOfficerMutation,
  useGetCollectionAssignmentsQuery,
} from '@/services/api/collectionAssignmentsApi';
import type { CollectionAssignmentRow } from '@/types/api/admin';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { formatINR } from '@/utils/currencyFormat';
import { queryErrorMessage } from '@/utils/queryError';

type OfficerFilter = 'all' | 'unassigned' | string;

export function CollectionAssignmentsScreen() {
  useCollectionAssignmentsSync();

  const [search, setSearch] = useState('');
  const [officerFilter, setOfficerFilter] = useState<OfficerFilter>('all');
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [assignModal, setAssignModal] = useState(false);
  const [singleTarget, setSingleTarget] = useState<CollectionAssignmentRow | null>(null);
  const [pickedOfficerId, setPickedOfficerId] = useState<string | null>(null);

  const { data: officers } = useGetOfficersQuery();
  const { data, isLoading, isError, error, refetch } = useGetCollectionAssignmentsQuery({
    search,
    officerFilter,
    outstandingOnly,
    limit: 100,
  });
  const [bulkAssign, { isLoading: bulkSaving }] = useBulkAssignCollectionOfficerMutation();
  const [assignOne, { isLoading: singleSaving }] = useAssignCollectionOfficerMutation();

  const officerFilterOptions = useMemo(() => {
    const base = [
      { value: 'all', label: 'All customers' },
      { value: 'unassigned', label: 'Unassigned' },
    ];
    const officerOpts = (officers ?? []).map((o) => ({ value: o.id, label: o.name }));
    return [...base, ...officerOpts];
  }, [officers]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const openBulkAssign = useCallback(() => {
    setSingleTarget(null);
    setPickedOfficerId(null);
    setAssignModal(true);
  }, []);

  const openSingleAssign = useCallback((row: CollectionAssignmentRow) => {
    setSingleTarget(row);
    setPickedOfficerId(row.assignedOfficerId ?? 'unassigned');
    setAssignModal(true);
  }, []);

  const closeAssignModal = useCallback(() => {
    setAssignModal(false);
    setSingleTarget(null);
    setPickedOfficerId(null);
  }, []);

  const confirmAssign = useCallback(async () => {
    const officerId = pickedOfficerId === 'unassigned' ? null : pickedOfficerId;
    try {
      if (singleTarget) {
        await assignOne({ customerId: singleTarget.id, officerId }).unwrap();
        Alert.alert('Updated', 'Collection assignment saved.');
      } else if (selected.length) {
        const result = await bulkAssign({ customerIds: selected, officerId }).unwrap();
        Alert.alert('Updated', `${result.updatedCount} customer(s) updated.`);
        setSelected([]);
        setBulkMode(false);
      }
      closeAssignModal();
      refetch();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save assignment');
    }
  }, [
    assignOne,
    bulkAssign,
    closeAssignModal,
    pickedOfficerId,
    refetch,
    selected,
    singleTarget,
  ]);

  const renderItem = useCallback(
    ({ item }: { item: CollectionAssignmentRow }) => {
      const isSelected = selected.includes(item.id);
      const assignmentLabel = item.assignedOfficerName ?? 'Unassigned';

      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.assignmentBadge}>
              <Text style={styles.assignmentBadgeText}>{assignmentLabel}</Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {item.customerId}
            {item.phone ? ` · ${item.phone}` : ''}
          </Text>
          <Text style={styles.amount}>
            Outstanding: {formatINR(item.outstandingAmount)}
            {item.nextDueDate ? ` · Due ${item.nextDueDate}` : ''}
          </Text>
          {item.paymentStatus ? (
            <Text style={styles.status}>{item.paymentStatus}</Text>
          ) : null}
          <View style={styles.actions}>
            {bulkMode ? (
              <Button
                label={isSelected ? 'Selected' : 'Select'}
                variant={isSelected ? 'primary' : 'secondary'}
                onPress={() => toggleSelect(item.id)}
              />
            ) : (
              <Button label="Assign" variant="secondary" onPress={() => openSingleAssign(item)} />
            )}
          </View>
        </View>
      );
    },
    [bulkMode, openSingleAssign, selected, toggleSelect],
  );

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={6} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  const rows = data?.items ?? [];

  return (
    <RoleGuard requiredPermission="payments.edit">
      <Screen padded={false}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Unassigned customers are not visible to officers until you assign them to a specific
            officer. Assigned customers are visible only to that officer.
          </Text>
        </View>

        <View style={styles.toolbar}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, account, phone…"
          />
          <FilterChips
            options={officerFilterOptions}
            selected={officerFilter}
            onSelect={(value) => setOfficerFilter(value as OfficerFilter)}
          />
          <FilterChips
            options={[
              { value: 'all', label: 'All balances' },
              { value: 'outstanding', label: 'Outstanding only' },
            ]}
            selected={outstandingOnly ? 'outstanding' : 'all'}
            onSelect={(value) => setOutstandingOnly(value === 'outstanding')}
          />
          <View style={styles.toolbarRow}>
            <Button
              label={bulkMode ? 'Cancel bulk' : 'Bulk assign'}
              variant="secondary"
              onPress={() => {
                setBulkMode((v) => !v);
                setSelected([]);
              }}
            />
            {bulkMode && selected.length > 0 ? (
              <Button label={`Assign ${selected.length}`} onPress={openBulkAssign} />
            ) : null}
          </View>
        </View>

        {!rows.length ? (
          <AdminEmptyState title="No customers match" icon="👥" />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
        )}

        <Modal visible={assignModal} transparent animationType="slide">
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {singleTarget ? `Assign ${singleTarget.name}` : `Assign ${selected.length} customers`}
              </Text>
              <Pressable
                style={[styles.officerOption, pickedOfficerId === 'unassigned' && styles.officerOptionActive]}
                onPress={() => setPickedOfficerId('unassigned')}
              >
                <Text style={styles.officerOptionText}>Unassigned</Text>
              </Pressable>
              {(officers ?? []).map((o) => (
                <Pressable
                  key={o.id}
                  style={[styles.officerOption, pickedOfficerId === o.id && styles.officerOptionActive]}
                  onPress={() => setPickedOfficerId(o.id)}
                >
                  <Text style={styles.officerOptionText}>{o.name}</Text>
                </Pressable>
              ))}
              <Button
                label="Confirm"
                onPress={() => void confirmAssign()}
                disabled={bulkSaving || singleSaving || pickedOfficerId == null}
              />
              <Button label="Cancel" variant="ghost" onPress={closeAssignModal} />
            </View>
          </View>
        </Modal>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  banner: {
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: adminColors.primaryTint,
    borderWidth: 1,
    borderColor: adminColors.permissionBoxBorder,
  },
  bannerText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  toolbar: { padding: spacing.md, gap: spacing.sm },
  toolbarRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  list: { padding: spacing.md, paddingTop: 0 },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: { fontWeight: '700', color: colors.textPrimary, flex: 1 },
  assignmentBadge: {
    borderWidth: 1,
    borderColor: adminColors.primary,
    backgroundColor: adminColors.primaryTint,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  assignmentBadgeText: { fontSize: 11, fontWeight: '600', color: adminColors.primary },
  meta: { fontSize: 13, color: colors.textSecondary },
  amount: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  status: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  actions: { marginTop: spacing.xs },
  modalBg: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surfaceWhite,
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  officerOption: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  officerOptionActive: {
    borderColor: adminColors.primary,
    backgroundColor: adminColors.primaryTint,
  },
  officerOptionText: { fontWeight: '600', color: colors.textPrimary },
});

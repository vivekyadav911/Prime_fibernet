import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { Officer, ServiceRequest } from '@prime/types';
import { Screen } from '@prime/ui';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import {
  useAssignRequestMutation,
  useEscalateRequestMutation,
  useGetAllRequestsQuery,
  useGetOfficersQuery,
} from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

import { AdminRequestRow } from './components/AdminRequestRow';
import { OfficerChip } from './components/OfficerChip';

export function AdminRequestsScreen() {
  const { data, isLoading, isError, error, refetch } = useGetAllRequestsQuery();
  const { data: officers } = useGetOfficersQuery();
  const [assignRequest] = useAssignRequestMutation();
  const [escalateRequest] = useEscalateRequestMutation();
  const [selectedOfficer, setSelectedOfficer] = useState<string | null>(null);

  const handleSelectOfficer = useCallback((officerId: string) => {
    setSelectedOfficer(officerId);
  }, []);

  const handleAssign = useCallback(
    (requestId: string) => {
      if (!selectedOfficer) return;
      assignRequest({ id: requestId, officerId: selectedOfficer });
      refetch();
    },
    [assignRequest, refetch, selectedOfficer],
  );

  const handleEscalate = useCallback(
    (requestId: string) => {
      escalateRequest(requestId);
      refetch();
    },
    [escalateRequest, refetch],
  );

  const officerKeyExtractor = useCallback((item: Officer) => item.id, []);

  const renderOfficerItem = useCallback(
    ({ item }: { item: Officer }) => (
      <OfficerChip officer={item} selected={selectedOfficer === item.id} onSelect={handleSelectOfficer} />
    ),
    [handleSelectOfficer, selectedOfficer],
  );

  const requestKeyExtractor = useCallback((item: ServiceRequest) => item.id, []);

  const renderRequestItem = useCallback(
    ({ item }: { item: ServiceRequest }) => (
      <AdminRequestRow
        request={item}
        canAssign={!!selectedOfficer}
        onAssign={handleAssign}
        onEscalate={handleEscalate}
      />
    ),
    [handleAssign, handleEscalate, selectedOfficer],
  );

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={6} showAvatar />
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

  if (!data?.length) {
    return (
      <Screen>
        <EmptyState title="No requests" subtitle="All clear — no open requests" icon="✅" />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.officerPicker}>
        <Text style={styles.pickerLabel}>Assign to officer:</Text>
        <FlatList
          horizontal
          data={officers ?? []}
          keyExtractor={officerKeyExtractor}
          renderItem={renderOfficerItem}
        />
      </View>
      <FlatList data={data} keyExtractor={requestKeyExtractor} renderItem={renderRequestItem} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  officerPicker: { padding: spacing.sm, borderBottomWidth: 1, borderColor: colors.borderDefault },
  pickerLabel: { fontWeight: '600', marginBottom: 8 },
});

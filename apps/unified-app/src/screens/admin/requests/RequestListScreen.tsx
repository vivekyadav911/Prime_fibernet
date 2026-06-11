import { useCallback, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ServiceRequest } from '@prime/types';
import { Button, Screen } from '@prime/ui';

import { AdminEmptyState, FilterChips, RoleGuard, SearchBar, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useAssignRequestMutation, useGetAllRequestsQuery, useGetOfficersQuery } from '@/store/api/endpoints';
import type { AdminRequestsStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminRequestsStackParamList, 'RequestList'>;

export function RequestListScreen({ navigation }: Props) {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [assignModal, setAssignModal] = useState(false);
  const [officerId, setOfficerId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useGetAllRequestsQuery();
  const { data: officers } = useGetOfficersQuery();
  const [assign] = useAssignRequestMutation();

  const filtered = (data ?? []).filter((r) => {
    if (status !== 'all' && r.status !== status) return false;
    if (search && !r.address.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const bulkAssign = async () => {
    if (!officerId || !selected.length) return;
    for (const id of selected) {
      await assign({ id, officerId });
    }
    setAssignModal(false);
    setSelected([]);
    refetch();
  };

  const renderItem = useCallback(
    ({ item }: { item: ServiceRequest }) => (
      <View style={styles.card}>
        <Text style={styles.id}>#{item.id.slice(0, 8)}</Text>
        <Text style={styles.type}>{item.requestType}</Text>
        <Text style={styles.addr}>{item.address}</Text>
        <StatusBadge status={item.status} />
        <View style={styles.actions}>
          {bulkMode ? (
            <Button label={selected.includes(item.id) ? 'Selected' : 'Select'} variant="secondary" onPress={() => toggleSelect(item.id)} />
          ) : (
            <Button label="Detail" variant="ghost" onPress={() => navigation.navigate('RequestDetail', { requestId: item.id })} />
          )}
        </View>
      </View>
    ),
    [bulkMode, navigation, selected],
  );

  if (isLoading) return <Screen><SkeletonLoader rows={6} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="requests.view">
      <Screen padded={false}>
        <View style={styles.toolbar}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search address…" />
          <FilterChips
            options={[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'assigned', label: 'Assigned' },
              { value: 'working', label: 'In Progress' },
              { value: 'resolved', label: 'Completed' },
            ]}
            selected={status}
            onSelect={setStatus}
          />
          <Button label={bulkMode ? 'Cancel bulk' : 'Bulk assign'} variant="secondary" onPress={() => setBulkMode(!bulkMode)} />
          {bulkMode && selected.length ? (
            <Button label={`Assign ${selected.length}`} onPress={() => setAssignModal(true)} />
          ) : null}
        </View>
        {!filtered.length ? <AdminEmptyState title="No requests" icon="✅" /> : (
          <FlatList data={filtered} keyExtractor={(r) => r.id} renderItem={renderItem} />
        )}
        <Modal visible={assignModal} transparent animationType="slide">
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Assign to officer</Text>
              {(officers ?? []).map((o) => (
                <Button key={o.id} label={o.name} variant={officerId === o.id ? 'primary' : 'ghost'} onPress={() => setOfficerId(o.id)} />
              ))}
              <Button label="Confirm assign" onPress={() => void bulkAssign()} />
              <Button label="Cancel" variant="ghost" onPress={() => setAssignModal(false)} />
            </View>
          </View>
        </Modal>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  toolbar: { padding: spacing.sm, gap: spacing.sm },
  card: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: spacing.xxs },
  id: { fontSize: 11, color: colors.textSecondary },
  type: { fontWeight: '600', textTransform: 'capitalize' },
  addr: { color: colors.textSecondary, fontSize: 13 },
  actions: { marginTop: spacing.xs },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surfaceWhite, padding: spacing.lg, gap: spacing.sm, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalTitle: { fontWeight: '700', fontSize: 18 },
});

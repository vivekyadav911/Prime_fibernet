import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, EmptyState, Screen, StatusChip, colors } from '@prime/ui';

import {
  useAssignRequestMutation,
  useEscalateRequestMutation,
  useGetAllRequestsQuery,
  useGetOfficersQuery,
} from '@/store/api/endpoints';

export function AdminRequestsScreen() {
  const { data, refetch } = useGetAllRequestsQuery();
  const { data: officers } = useGetOfficersQuery();
  const [assignRequest] = useAssignRequestMutation();
  const [escalateRequest] = useEscalateRequestMutation();
  const [selectedOfficer, setSelectedOfficer] = useState<string | null>(null);

  if (!data?.length) {
    return (
      <Screen>
        <EmptyState title="No requests" description="Service requests will appear here" />
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
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.officerChip, selectedOfficer === item.id && styles.officerChipActive]}
              onPress={() => setSelectedOfficer(item.id)}
            >
              <Text style={styles.officerChipText}>{item.name}</Text>
            </Pressable>
          )}
        />
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.type}>{item.requestType}</Text>
            <Text style={styles.address}>{item.address}</Text>
            <View style={styles.chips}>
              <StatusChip status={item.status} />
              <StatusChip status={item.priority} />
              {item.officerId ? null : <Text style={styles.unassigned}>Unassigned</Text>}
            </View>
            <View style={styles.actions}>
              <Button
                label="Assign"
                variant="secondary"
                onPress={() => {
                  if (!selectedOfficer) return;
                  assignRequest({ id: item.id, officerId: selectedOfficer });
                  refetch();
                }}
              />
              <Button label="Escalate" variant="ghost" onPress={() => { escalateRequest(item.id); refetch(); }} />
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  officerPicker: { padding: 12, borderBottomWidth: 1, borderColor: colors.borderDefault },
  pickerLabel: { fontWeight: '600', marginBottom: 8 },
  officerChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.borderDefault, marginRight: 8 },
  officerChipActive: { backgroundColor: colors.primaryNavy, borderColor: colors.primaryNavy },
  officerChipText: { color: colors.textPrimary, fontSize: 12 },
  card: { padding: 16, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: 8 },
  type: { textTransform: 'capitalize', fontWeight: '600', fontSize: 16 },
  address: { color: colors.textSecondary },
  chips: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  unassigned: { color: colors.warningAmber, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8 },
});

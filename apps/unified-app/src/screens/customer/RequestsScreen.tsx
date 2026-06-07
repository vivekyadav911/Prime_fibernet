import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, EmptyState, Screen, StatusChip, colors } from '@prime/ui';
import type { RequestType, ServiceRequest } from '@prime/types';

import { getSupabase } from '@/services/supabase';
import { useAppSelector } from '@/store/hooks';
import {
  useCreateRequestMutation,
  useGetMyRequestsQuery,
  useGetRequestActivitiesQuery,
} from '@/store/api/endpoints';

const REQUEST_TYPES: RequestType[] = ['installation', 'repair', 'upgrade', 'complaint'];

export function RequestsScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data, refetch } = useGetMyRequestsQuery(user?.id ?? '', { skip: !user?.id });
  const [createRequest] = useCreateRequestMutation();
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [requestType, setRequestType] = useState<RequestType>('repair');
  const [selected, setSelected] = useState<ServiceRequest | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const channel = getSupabase()
      .channel('my-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_requests', filter: `user_id=eq.${user.id}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      void getSupabase().removeChannel(channel);
    };
  }, [user?.id, refetch]);

  const onCreate = async () => {
    if (!user || !address.trim()) return;
    await createRequest({ userId: user.id, requestType, address, description });
    setAddress('');
    setDescription('');
    refetch();
  };

  return (
    <Screen padded={false}>
      <View style={styles.form}>
        <View style={styles.typeRow}>
          {REQUEST_TYPES.map((t) => (
            <Pressable
              key={t}
              style={[styles.typeChip, requestType === t && styles.typeChipActive]}
              onPress={() => setRequestType(t)}
            >
              <Text style={[styles.typeText, requestType === t && styles.typeTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput style={styles.input} placeholder="Address" value={address} onChangeText={setAddress} />
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Description (max 500 chars)"
          multiline
          maxLength={500}
          value={description}
          onChangeText={setDescription}
        />
        <Button label="Raise request" onPress={onCreate} />
      </View>
      {!data?.length ? (
        <EmptyState title="No requests" description="Create your first service request above" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => setSelected(item)}>
              <View>
                <Text style={styles.type}>{item.requestType}</Text>
                <Text style={styles.address}>{item.address}</Text>
              </View>
              <StatusChip status={item.status} />
            </Pressable>
          )}
        />
      )}
      <RequestDetailModal request={selected} onClose={() => setSelected(null)} />
    </Screen>
  );
}

function RequestDetailModal({ request, onClose }: { request: ServiceRequest | null; onClose: () => void }) {
  const { data: activities } = useGetRequestActivitiesQuery(request?.id ?? '', { skip: !request?.id });

  return (
    <Modal visible={!!request} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modal}>
        <Text style={styles.modalTitle}>{request?.requestType}</Text>
        <StatusChip status={request?.status ?? 'pending'} />
        <Text style={styles.modalAddress}>{request?.address}</Text>
        <Text style={styles.modalDesc}>{request?.description}</Text>
        <Text style={styles.timelineTitle}>Timeline</Text>
        {(activities ?? []).map((a) => (
          <Text key={a.id} style={styles.timelineItem}>
            {new Date(a.createdAt).toLocaleString()} — {a.note ?? 'Status updated'}
          </Text>
        ))}
        {!activities?.length ? <Text style={styles.muted}>No activity yet</Text> : null}
        <Button label="Close" variant="secondary" onPress={onClose} style={styles.closeBtn} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  form: { padding: 16, gap: 8 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.borderDefault },
  typeChipActive: { backgroundColor: colors.primaryNavy, borderColor: colors.primaryNavy },
  typeText: { textTransform: 'capitalize', color: colors.textPrimary, fontSize: 12 },
  typeTextActive: { color: colors.white },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.surfaceWhite,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  type: { textTransform: 'capitalize', fontWeight: '600' },
  address: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  modal: { flex: 1, padding: 24, paddingTop: 60, backgroundColor: colors.white, gap: 12 },
  modalTitle: { fontSize: 22, fontWeight: '700', textTransform: 'capitalize' },
  modalAddress: { color: colors.textSecondary },
  modalDesc: { marginTop: 8 },
  timelineTitle: { fontWeight: '600', marginTop: 16 },
  timelineItem: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  muted: { color: colors.textSecondary },
  closeBtn: { marginTop: 24 },
});

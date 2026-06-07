import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, EmptyState, Screen, colors } from '@prime/ui';

import { useAppSelector } from '@/store/hooks';
import { useCreateRequestMutation, useGetMyRequestsQuery } from '@/store/api/endpoints';

export function RequestsScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data, refetch } = useGetMyRequestsQuery(user?.id ?? '', { skip: !user?.id });
  const [createRequest] = useCreateRequestMutation();
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  const onCreate = async () => {
    if (!user) return;
    await createRequest({
      userId: user.id,
      requestType: 'repair',
      address,
      description,
    });
    setAddress('');
    setDescription('');
    refetch();
  };

  return (
    <Screen padded={false}>
      <View style={styles.form}>
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
            <View style={styles.row}>
              <Text style={styles.type}>{item.requestType}</Text>
              <Text style={styles.status}>{item.status}</Text>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { padding: 16, gap: 8 },
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
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  type: { textTransform: 'capitalize' },
  status: { color: colors.accentTeal },
});

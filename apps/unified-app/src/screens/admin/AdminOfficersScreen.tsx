import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useGetOfficersQuery, useInviteOfficerMutation, useUpdateOfficerMutation } from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

export function AdminOfficersScreen() {
  const { data, isLoading, isError, error, refetch } = useGetOfficersQuery();
  const [inviteOfficer] = useInviteOfficerMutation();
  const [updateOfficer] = useUpdateOfficerMutation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('North Delhi');

  const onInvite = async () => {
    if (!email || !name) return;
    await inviteOfficer({ email, name, phone, region });
    setEmail('');
    setName('');
    refetch();
  };

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

  return (
    <Screen padded={false}>
      <View style={styles.form}>
        <Text style={styles.formTitle}>Invite officer</Text>
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Phone" value={phone} onChangeText={setPhone} />
        <TextInput style={styles.input} placeholder="Region" value={region} onChangeText={setRegion} />
        <Button label="Send invite" onPress={onInvite} />
      </View>
      {!data?.length ? (
        <EmptyState title="No officers yet" subtitle="Invite your first officer" icon="🛡️" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.email} · {item.region ?? 'No region'}</Text>
                <Text style={styles.meta}>Status: {item.availabilityStatus}</Text>
              </View>
              <Button
                label="Set available"
                variant="secondary"
                onPress={() => updateOfficer({ id: item.id, availabilityStatus: 'available' })}
              />
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { padding: 16, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: 8 },
  formTitle: { fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 8, padding: 10 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: colors.borderDefault },
  name: { fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: 12 },
});

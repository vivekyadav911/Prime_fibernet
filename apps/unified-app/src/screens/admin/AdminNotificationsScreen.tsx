import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Screen, StatusChip, colors } from '@prime/ui';

import { useGetNotificationHistoryQuery, useSendBulkNotificationMutation } from '@/store/api/endpoints';

const AUDIENCES = ['all', 'customers', 'officers', 'admins'];

export function AdminNotificationsScreen() {
  const { data: history, refetch } = useGetNotificationHistoryQuery();
  const [sendBulk] = useSendBulkNotificationMutation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');

  const onSend = async () => {
    if (!title || !body) return;
    await sendBulk({ title, body, audience });
    setTitle('');
    setBody('');
    refetch();
  };

  return (
    <Screen padded={false}>
      <View style={styles.form}>
        <Text style={styles.formTitle}>Send notification</Text>
        <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
        <TextInput style={styles.input} placeholder="Message body" value={body} onChangeText={setBody} multiline />
        <View style={styles.audienceRow}>
          {AUDIENCES.map((a) => (
            <Text
              key={a}
              style={[styles.audienceChip, audience === a && styles.audienceActive]}
              onPress={() => setAudience(a)}
            >
              {a}
            </Text>
          ))}
        </View>
        <Button label="Queue notification" onPress={onSend} />
      </View>
      <Text style={styles.historyTitle}>Delivery history</Text>
      <FlatList
        data={history ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>{item.title}</Text>
              <Text style={styles.meta}>{item.audience} · Sent: {item.sentCount}</Text>
            </View>
            <StatusChip status={item.status} />
          </View>
        )}
        ListEmptyComponent={<Text style={styles.muted}>No notifications sent yet</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { padding: 16, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: 8 },
  formTitle: { fontWeight: '600' },
  input: { borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 8, padding: 10 },
  audienceRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  audienceChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.borderDefault, textTransform: 'capitalize' },
  audienceActive: { backgroundColor: colors.primaryNavy, color: colors.white, borderColor: colors.primaryNavy },
  historyTitle: { fontWeight: '600', padding: 16, paddingBottom: 8 },
  row: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: colors.borderDefault, alignItems: 'center' },
  notifTitle: { fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: 12 },
  muted: { padding: 16, color: colors.textSecondary },
});

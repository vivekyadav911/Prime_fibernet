import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Button, Screen } from '@prime/ui';

import { ConfirmModal, FormField, RoleGuard, SectionCard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetNotificationHistoryQuery, useSendBulkNotificationMutation } from '@/store/api/endpoints';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

const TARGETS = ['all', 'customers', 'officers', 'plan', 'city', 'individual'];

export function NotificationCenterScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('all');
  const [scheduledAt, setScheduledAt] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: history, isLoading, isError, error, refetch } = useGetNotificationHistoryQuery();
  const [send] = useSendBulkNotificationMutation();

  const onSend = async () => {
    try {
      await send({ title, body, audience: target }).unwrap();
      setTitle('');
      setBody('');
      setConfirmOpen(false);
      refetch();
      Alert.alert('Queued', 'Notification has been queued for delivery.');
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not send');
    }
  };

  const renderHistory = useCallback(
    ({ item }: { item: NonNullable<typeof history>[number] }) => (
      <View style={styles.historyRow}>
        <Text style={styles.historyTitle}>{item.title}</Text>
        <Text style={styles.historyMeta}>{item.audience} · {item.sentCount} sent · {new Date(item.createdAt).toLocaleString()}</Text>
      </View>
    ),
    [],
  );

  if (isLoading) return <Screen><SkeletonLoader rows={6} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="notifications.view">
      <Screen padded={false}>
        <View style={styles.compose}>
          <SectionCard title="Compose notification">
            <FormField label="Title" value={title} onChangeText={setTitle} />
            <FormField label="Message" value={body} onChangeText={setBody} multiline />
            <View style={styles.targetRow}>
              {TARGETS.map((t) => (
                <Button key={t} label={t} variant={target === t ? 'primary' : 'ghost'} onPress={() => setTarget(t)} />
              ))}
            </View>
            <FormField label="Schedule (optional ISO datetime)" value={scheduledAt} onChangeText={setScheduledAt} />
            <Button label="Send" onPress={() => setConfirmOpen(true)} disabled={!title || !body} />
          </SectionCard>
        </View>
        <Text style={styles.historyHeader}>Sent history</Text>
        <FlatList data={history ?? []} keyExtractor={(h) => h.id} renderItem={renderHistory} />
        <ConfirmModal
          visible={confirmOpen}
          title="Send notification?"
          message={`Send "${title}" to ${target}?`}
          onConfirm={() => void onSend()}
          onCancel={() => setConfirmOpen(false)}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  compose: { padding: spacing.sm },
  targetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  historyHeader: { fontWeight: '700', padding: spacing.md, paddingBottom: spacing.xs },
  historyRow: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault },
  historyTitle: { fontWeight: '600' },
  historyMeta: { fontSize: 12, color: colors.textSecondary },
});

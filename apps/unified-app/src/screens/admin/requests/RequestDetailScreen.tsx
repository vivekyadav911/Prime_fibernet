import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminButton, AdminScreenLayout, AdminStateShell, FormField, RoleGuard, SectionCard, StatusBadge } from '@/components/admin';
import {
  useAddRequestActivityMutation,
  useGetRequestDetailQuery,
  useUpdateRequestStatusMutation,
} from '@/store/api/endpoints';
import type { AdminRequestsStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<AdminRequestsStackParamList, 'RequestDetail'>;

const STEPS = ['pending', 'assigned', 'working', 'resolved'];

export function RequestDetailScreen({ route }: Props) {
  const { requestId } = route.params;
  const { data: request, isLoading, isError, error, refetch } = useGetRequestDetailQuery(requestId);
  const [updateStatus] = useUpdateRequestStatusMutation();
  const [addNote] = useAddRequestActivityMutation();
  const [note, setNote] = useState('');

  const onAddNote = async () => {
    if (!note.trim()) return;
    await addNote({ requestId, action: 'Admin note', officerName: 'Admin', notes: note });
    setNote('');
    refetch();
  };

  return (
    <RoleGuard requiredPermission="requests.view">
      <AdminStateShell
        isLoading={isLoading}
        isError={isError || !request}
        error={error}
        onRetry={refetch}
        loadingRows={6}
      >
      {request ? (
      <AdminScreenLayout>
        {(() => {
          const stepIndex = STEPS.indexOf(request.status);
          return (
            <>
        <Text style={styles.title}>{request.requestType}</Text>
        <StatusBadge status={request.status} />
        <Text style={styles.meta}>{request.address}</Text>
        <Text style={styles.desc}>{request.description ?? '—'}</Text>

        <SectionCard title="Status timeline">
          {STEPS.map((step, i) => (
            <View key={step} style={styles.step}>
              <Text style={[styles.stepDot, i <= stepIndex && styles.stepActive]}>●</Text>
              <Text style={styles.stepLabel}>{step.replace('_', ' ')}</Text>
            </View>
          ))}
        </SectionCard>

        <SectionCard title="Activity log">
          {(request.activities ?? []).map((a) => (
            <Text key={a.id} style={styles.log}>
              {a.note ?? '—'} · {new Date(a.createdAt).toLocaleString()}
            </Text>
          ))}
        </SectionCard>

        <RoleGuard requiredPermission="requests.edit">
          <FormField label="Add note" value={note} onChangeText={setNote} multiline />
          <AdminButton label="Add note" onPress={() => void onAddNote()} />
          <View style={styles.statusRow}>
            {STEPS.map((s) => (
              <AdminButton key={s} label={s} variant="ghost" onPress={() => updateStatus({ id: requestId, status: s, note: `Status → ${s}` })} />
            ))}
          </View>
        </RoleGuard>
            </>
          );
        })()}
      </AdminScreenLayout>
      ) : null}
      </AdminStateShell>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', textTransform: 'capitalize', color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginVertical: spacing.xs },
  desc: { marginBottom: spacing.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  stepDot: { color: colors.borderDefault },
  stepActive: { color: colors.accentTeal },
  stepLabel: { textTransform: 'capitalize' },
  log: { fontSize: 12, color: colors.textSecondary, paddingVertical: 2 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
});

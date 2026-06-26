import { useCallback } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, Button } from '@prime/ui';

import { AdminScreenLayout, RoleGuard, SectionCard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetComplaintQuery } from '@/services/api/adminSupportApi';
import { updateComplaint } from '@/services/complaintService';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminSupportStackParamList } from '@/types/navigation';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminSupportStackParamList, 'ComplaintDetail'>;

export function ComplaintDetailScreen({ route, navigation }: Props) {
  const { complaintId } = route.params;
  const { data: complaint, isLoading, isError, error, refetch } = useGetComplaintQuery(complaintId);

  const handleStatus = useCallback(
    async (status: 'investigating' | 'resolved' | 'escalated') => {
      try {
        await updateComplaint(complaintId, { status });
        await refetch();
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Update failed');
      }
    },
    [complaintId, refetch],
  );

  if (isLoading) return <Screen><SkeletonLoader rows={5} /></Screen>;
  if (isError || !complaint) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminScreenLayout>
        <SectionCard title={complaint.complaintNumber}>
          <Text style={styles.label}>Customer</Text>
          <Text style={styles.value}>{complaint.customerName}</Text>
          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{complaint.complaintType} ({complaint.severity})</Text>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{complaint.status}</Text>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.body}>{complaint.description}</Text>
        </SectionCard>

        <View style={styles.actions}>
          <Button label="Investigate" variant="ghost" onPress={() => void handleStatus('investigating')} />
          <Button label="Escalate" variant="ghost" onPress={() => void handleStatus('escalated')} />
          <Button label="Resolve" onPress={() => void handleStatus('resolved')} />
        </View>

        {complaint.linkedTicketId ? (
          <Button
            label="View Linked Ticket"
            variant="ghost"
            onPress={() => navigation.navigate('TicketDetail', { ticketId: complaint.linkedTicketId! })}
          />
        ) : null}
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginTop: spacing.sm },
  value: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  body: { fontSize: 14, color: colors.textPrimary, lineHeight: 20, marginTop: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
});

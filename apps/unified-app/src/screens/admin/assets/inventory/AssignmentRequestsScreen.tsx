import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { RoleGuard, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  fetchAssignmentRequests,
  reviewAssignmentRequest,
} from '@/services/inventoryService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminInventoryStackParamList } from '@/types/navigation';
import type { AssignmentRequest } from '@/types/inventory';

type Props = NativeStackScreenProps<AdminInventoryStackParamList, 'AssignmentRequests'>;

export function AssignmentRequestsScreen(_props: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [requests, setRequests] = useState<AssignmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchAssignmentRequests('pending');
      setRequests(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    if (!user) return;
    setReviewingId(id);
    try {
      await reviewAssignmentRequest(id, action, user.id, user.name);
      dispatch(enqueueToast({
        message: action === 'approve' ? 'Request approved' : 'Request rejected',
        type: 'success', id: `toast-${Date.now()}`,
      }));
      await load();
    } catch (e) {
      dispatch(enqueueToast({
        message: e instanceof Error ? e.message : 'Review failed',
        type: 'error', id: `toast-${Date.now()}`,
      }));
    } finally {
      setReviewingId(null);
    }
  };

  if (isLoading) {
    return (
      <RoleGuard requiredPermission="inventory.edit">
        <Screen><SkeletonLoader rows={6} /></Screen>
      </RoleGuard>
    );
  }

  if (error) {
    return (
      <RoleGuard requiredPermission="inventory.edit">
        <Screen><ErrorState message={error} onRetry={load} /></Screen>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredPermission="inventory.edit">
      <Screen padded={false}>
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          ListEmptyComponent={
            <Text style={styles.empty}>No pending assignment requests</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.name}>
                {item.officerName} → {item.itemName} ×{item.quantity}
              </Text>
              {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
              <StatusBadge status={item.status} />
              <View style={styles.actions}>
                <Button
                  label="Approve"
                  variant="secondary"
                  disabled={reviewingId === item.id}
                  onPress={() => void handleReview(item.id, 'approve')}
                />
                <Button
                  label="Reject"
                  variant="ghost"
                  disabled={reviewingId === item.id}
                  onPress={() => void handleReview(item.id, 'reject')}
                />
              </View>
            </View>
          )}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  row: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: spacing.xs },
  name: { fontWeight: '600', fontSize: 15 },
  notes: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  empty: { padding: spacing.xl, textAlign: 'center', color: colors.textSecondary },
});

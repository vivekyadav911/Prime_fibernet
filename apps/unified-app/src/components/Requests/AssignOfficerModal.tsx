import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminEmptyState, AvatarIcon } from '@/components/admin';
import { DismissKeyboardFlatList, ErrorState, FullScreenModalShell } from '@/components/common';
import { fetchOfficers } from '@/services/requestsService';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { Officer } from '@/types/requests';

type AssignOfficerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (officer: Officer) => void | Promise<void>;
  loading?: boolean;
};

export function AssignOfficerModal({ visible, onClose, onSelect, loading }: AssignOfficerModalProps) {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOfficers = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const data = await fetchOfficers();
      setOfficers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load officers');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (visible) void loadOfficers();
  }, [visible, loadOfficers]);

  const handleSelect = useCallback(
    async (officer: Officer) => {
      try {
        await onSelect(officer);
        onClose();
      } catch {
        // Keep modal open; parent surfaces the error toast.
      }
    },
    [onClose, onSelect],
  );

  return (
    <FullScreenModalShell
      visible={visible}
      onRequestClose={onClose}
      title="Assign to Officer"
      onCancel={onClose}
      animationType="slide"
    >
      <View style={styles.body}>
        {fetching ? (
          <ActivityIndicator color={adminColors.primary} style={styles.loader} />
        ) : error ? (
          <ErrorState message={error} onRetry={loadOfficers} />
        ) : !officers.length ? (
          <AdminEmptyState
            title="No officers available"
            subtitle="Please add officers first."
            iconName="shield-outline"
          />
        ) : (
          <DismissKeyboardFlatList
            data={officers}
            keyExtractor={(o) => o.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={false}
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => void handleSelect(item)}
                disabled={loading}
              >
                <AvatarIcon name={item.name} size={40} />
                <View style={styles.rowText}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.area}>{item.area}</Text>
                </View>
              </Pressable>
            )}
          />
        )}

        {loading ? <ActivityIndicator color={adminColors.primary} style={styles.loader} /> : null}
      </View>
    </FullScreenModalShell>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  rowText: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  area: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  loader: { marginVertical: spacing.lg },
});

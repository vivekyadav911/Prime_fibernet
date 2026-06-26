import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminEmptyState, AvatarIcon } from '@/components/admin';
import { DismissKeyboardFlatList } from '@/components/common';
import { fetchOfficers } from '@/services/requestsService';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { Officer } from '@/types/requests';

type AssignOfficerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (officer: Officer) => void | Promise<void>;
  loading?: boolean;
};

export function AssignOfficerModal({ visible, onClose, onSelect, loading }: AssignOfficerModalProps) {
  const insets = useSafeAreaInsets();
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
      await onSelect(officer);
      onClose();
    },
    [onClose, onSelect],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { paddingTop: insets.top }]}
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}
      >
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.title}>Assign to Officer</Text>

          {fetching ? (
            <ActivityIndicator color={adminColors.primary} style={styles.loader} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
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

          {loading ? <ActivityIndicator color={adminColors.primary} /> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  list: { maxHeight: 360 },
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
  error: { color: colors.errorRed, fontSize: 14, marginVertical: spacing.md },
});

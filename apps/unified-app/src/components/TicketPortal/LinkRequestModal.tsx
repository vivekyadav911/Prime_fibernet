import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchBar, StatusBadge } from '@/components/admin';
import { ErrorState } from '@/components/common';
import { fetchRequests } from '@/services/requestsService';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { ServiceRequest } from '@/types/requests';
import { truncateRequestId } from '@/utils/requestViewMappers';

type LinkRequestModalProps = {
  visible: boolean;
  linkedRequestId: string | null;
  onClose: () => void;
  onSelect: (request: ServiceRequest | null) => void;
};

export function LinkRequestModal({
  visible,
  linkedRequestId,
  onClose,
  onSelect,
}: LinkRequestModalProps) {
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRequests();
      setRequests(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(
      (r) =>
        r.customerName.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q),
    );
  }, [requests, search]);

  const handleSelect = useCallback(
    (request: ServiceRequest) => {
      onSelect(request);
      onClose();
    },
    [onClose, onSelect],
  );

  const handleClear = useCallback(() => {
    onSelect(null);
    onClose();
  }, [onClose, onSelect]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Link to Existing Request</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          {linkedRequestId ? (
            <Pressable style={styles.clearBtn} onPress={handleClear}>
              <Text style={styles.clearText}>Clear Link</Text>
            </Pressable>
          ) : null}

          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search by ID or customer name…"
          />

          {loading ? (
            <ActivityIndicator color={adminColors.primary} style={styles.loader} />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              style={styles.list}
              ListEmptyComponent={
                <Text style={styles.empty}>No requests found</Text>
              }
              renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => handleSelect(item)}>
                  <Text style={styles.requestId}>{truncateRequestId(item.id)}</Text>
                  <Text style={styles.rowTitle}>{item.type}</Text>
                  <Text style={styles.rowSub}>{item.customerName}</Text>
                  <StatusBadge status={item.status.toLowerCase().replace(/\s+/g, '_')} />
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '85%',
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  close: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  clearBtn: {
    marginBottom: spacing.sm,
  },
  clearText: {
    color: adminColors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  list: {
    marginTop: spacing.sm,
  },
  row: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    gap: 2,
  },
  requestId: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: adminColors.primary,
    fontWeight: '600',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: spacing.xl,
  },
});

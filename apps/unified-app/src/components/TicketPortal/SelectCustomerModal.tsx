import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pagination, SearchBar } from '@/components/admin';
import { DismissKeyboardFlatList, ErrorState } from '@/components/common';
import { useKeyboardBottomInset } from '@/hooks/useKeyboardBottomInset';
import { useGetAdminUsersQuery } from '@/store/api/endpoints';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminUserListItem } from '@/types/api/admin';

type SelectCustomerModalProps = {
  visible: boolean;
  selectedCustomerId: string | null;
  onClose: () => void;
  onSelect: (customer: AdminUserListItem | null) => void;
};

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 400;

export function SelectCustomerModal({
  visible,
  selectedCustomerId,
  onClose,
  onSelect,
}: SelectCustomerModalProps) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset(spacing.md);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!visible) {
      setSearch('');
      setPage(1);
    }
  }, [visible]);

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    setPage(1);
  }, []);

  const { data, isLoading, isFetching, isError, error, refetch } = useGetAdminUsersQuery(
    {
      page,
      limit: PAGE_SIZE,
      search: search.trim() || undefined,
      status: 'active',
    },
    { skip: !visible },
  );

  const customers = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showInitialLoader = isLoading && customers.length === 0;

  const resultSummary = useMemo(() => {
    if (total === 0) return 'No customers match your search';
    const from = (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, total);
    if (total === 1) return 'Showing 1 of 1 customer';
    if (from === to) return `Showing ${from} of ${total.toLocaleString('en-IN')} customers`;
    return `Showing ${from}–${to} of ${total.toLocaleString('en-IN')} customers`;
  }, [page, total]);

  const handleSelect = useCallback(
    (customer: AdminUserListItem) => {
      onSelect(customer);
      onClose();
    },
    [onClose, onSelect],
  );

  const handleClear = useCallback(() => {
    onSelect(null);
    onClose();
  }, [onClose, onSelect]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderCustomerRow = useCallback(
    ({ item }: { item: AdminUserListItem }) => {
      const selected = item.id === selectedCustomerId;
      return (
        <Pressable
          style={[styles.row, selected && styles.rowSelected]}
          onPress={() => handleSelect(item)}
        >
          <Text style={styles.rowTitle}>{item.name}</Text>
          <Text style={styles.rowSub}>
            {[item.phone, item.email].filter(Boolean).join(' · ') || 'No contact info'}
          </Text>
          <Text style={styles.rowMeta}>
            {[item.city, item.planName].filter(Boolean).join(' · ')}
          </Text>
        </Pressable>
      );
    },
    [handleSelect, selectedCustomerId],
  );

  const listFooter = useMemo(() => {
    if (totalPages <= 1) return <View style={styles.footerSpacer} />;
    return (
      <View style={styles.paginationWrap}>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </View>
    );
  }, [page, totalPages]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            Keyboard.dismiss();
            handleClose();
          }}
        >
          <Pressable
            style={[
              styles.card,
              {
                paddingBottom: Math.max(insets.bottom + spacing.md, keyboardInset),
                maxHeight: keyboardInset > 0 ? '78%' : '88%',
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
          <View style={styles.header}>
            <Text style={styles.title}>Select Customer</Text>
            <Pressable
              onPress={handleClose}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            >
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          {selectedCustomerId ? (
            <Pressable style={styles.clearBtn} onPress={handleClear}>
              <Text style={styles.clearText}>Clear Selection</Text>
            </Pressable>
          ) : null}

          <View style={styles.searchWrap}>
            <SearchBar
              value={search}
              onChangeText={handleSearchChange}
              placeholder="Search by name, email, or phone…"
              debounceMs={SEARCH_DEBOUNCE_MS}
            />
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>{resultSummary}</Text>
            {isFetching && !showInitialLoader ? (
              <View style={styles.updatingRow}>
                <ActivityIndicator size="small" color={adminColors.primary} />
                <Text style={styles.updatingText}>Updating…</Text>
              </View>
            ) : null}
          </View>

          {showInitialLoader ? (
            <ActivityIndicator color={adminColors.primary} style={styles.loader} />
          ) : isError ? (
            <ErrorState
              message={error instanceof Error ? error.message : 'Failed to load customers'}
              onRetry={refetch}
            />
          ) : (
            <View style={styles.listWrap}>
              <DismissKeyboardFlatList
                data={customers}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <Text style={styles.empty}>
                    {search.trim()
                      ? 'No customers found for this search'
                      : 'No active customers found'}
                  </Text>
                }
                ListFooterComponent={listFooter}
                renderItem={renderCustomerRow}
              />
            </View>
          )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    minHeight: 380,
    width: '100%',
    padding: spacing.md,
    flexShrink: 1,
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
  searchWrap: {
    alignSelf: 'stretch',
    width: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    minHeight: 20,
    gap: spacing.sm,
  },
  summaryText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  updatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  updatingText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  listWrap: {
    flex: 1,
    minHeight: 200,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.sm,
  },
  row: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    gap: 2,
  },
  rowSelected: {
    backgroundColor: adminColors.primaryTint,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  rowMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: spacing.xl,
  },
  paginationWrap: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  footerSpacer: {
    height: spacing.xs,
  },
});

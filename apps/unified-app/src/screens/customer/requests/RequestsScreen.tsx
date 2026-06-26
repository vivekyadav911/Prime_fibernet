import { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import type { RequestType } from '@prime/types';
import { Screen } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { CreateRequestForm, type CreateRequestFormValues } from './components/CreateRequestForm';
import { RequestListItem } from './components/RequestListItem';
import { RequestTypeSheet } from './components/RequestTypeSheet';
import { useRequests } from './hooks/useRequests';

export function RequestsScreen() {
  const {
    requests,
    attachments,
    addAttachment,
    removeAttachment,
    isLoading,
    error,
    refetch,
    submitRequest,
    cancelRequest,
  } = useRequests();

  const typeSheetRef = useRef<BottomSheet>(null);
  const [showForm, setShowForm] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>('repair');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (values: CreateRequestFormValues) => {
    setSubmitting(true);
    try {
      await submitRequest(values);
      setShowForm(false);
      Alert.alert('Request submitted', 'We will update you on progress.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = useCallback(
    (id: string) => {
      Alert.alert('Cancel request?', 'This cannot be undone.', [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel request',
          style: 'destructive',
          onPress: () => cancelRequest(id),
        },
      ]);
    },
    [cancelRequest],
  );

  const keyExtractor = useCallback((item: (typeof requests)[number]) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: (typeof requests)[number] }) => (
      <RequestListItem request={item} onCancel={() => onCancel(item.id)} />
    ),
    [onCancel],
  );

  if (error) {
    return (
      <Screen>
        <ErrorState message="Failed to load requests" onRetry={refetch} />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={4} rowHeight={100} shape="card" />
      </Screen>
    );
  }

  return (
    <Screen padded={false} style={styles.screen}>
      {showForm ? (
        <CreateRequestForm
          attachments={attachments}
          selectedRequestType={requestType}
          onAddAttachment={addAttachment}
          onRemoveAttachment={removeAttachment}
          onSubmit={onSubmit}
          onOpenTypeSheet={() => typeSheetRef.current?.expand()}
          submitting={submitting}
        />
      ) : null}

      {!requests.length && !showForm ? (
        <EmptyState
          title="No service requests"
          subtitle="Tap + to raise your first request"
          icon="📋"
          actionLabel="New request"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            showForm ? null : (
              <Text style={styles.sectionTitle}>Your requests</Text>
            )
          }
        />
      )}

      <Pressable style={styles.fab} onPress={() => setShowForm((v) => !v)}>
        <Text style={styles.fabText}>{showForm ? '✕' : '+'}</Text>
      </Pressable>

      <RequestTypeSheet
        ref={typeSheetRef}
        selected={requestType}
        onSelect={(type) => {
          setRequestType(type);
          typeSheetRef.current?.close();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  list: { padding: spacing.md, paddingBottom: spacing.xxxl },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: colors.white, fontSize: 28, fontWeight: '300' },
});

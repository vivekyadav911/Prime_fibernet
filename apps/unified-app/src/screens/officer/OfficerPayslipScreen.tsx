import { useCallback } from 'react';
import { FlatList, Linking, StyleSheet } from 'react-native';
import type { Payslip } from '@prime/types';
import { Screen } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useAppSelector } from '@/store/hooks';
import { useGetPayslipsQuery } from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

import { EarningsRow } from './components/EarningsRow';

export function OfficerPayslipScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data, isLoading, isError, error, refetch } = useGetPayslipsQuery(user?.id ?? '', { skip: !user?.id });

  const handleOpenPdf = useCallback((url: string) => {
    void Linking.openURL(url);
  }, []);

  const keyExtractor = useCallback((item: Payslip) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: Payslip }) => <EarningsRow payslip={item} onOpenPdf={handleOpenPdf} />,
    [handleOpenPdf],
  );

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={6} showAvatar />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  if (!data?.length) {
    return (
      <Screen>
        <EmptyState title="No payslips" subtitle="Monthly payslips will appear here" icon="💰" />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
});

import { FlatList, Linking, StyleSheet, Text } from 'react-native';
import { Screen, colors } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useAppSelector } from '@/store/hooks';
import { useGetPayslipsQuery } from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

export function OfficerPayslipScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data, isLoading, isError, error, refetch } = useGetPayslipsQuery(user?.id ?? '', { skip: !user?.id });

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
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Text
            style={styles.row}
            onPress={() => item.pdfUrl && Linking.openURL(item.pdfUrl)}
          >
            {new Date(item.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} — ₹
            {item.netPay.toFixed(2)}
            {item.pdfUrl ? ' · Download PDF' : ''}
          </Text>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.borderDefault, color: colors.primaryNavy },
});

import { FlatList, Linking, StyleSheet, Text } from 'react-native';
import { EmptyState, Screen, colors } from '@prime/ui';

import { useAppSelector } from '@/store/hooks';
import { useGetPayslipsQuery } from '@/store/api/endpoints';

export function OfficerPayslipScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data } = useGetPayslipsQuery(user?.id ?? '', { skip: !user?.id });

  if (!data?.length) {
    return (
      <Screen>
        <EmptyState title="No payslips" description="Monthly payslips will appear here" />
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

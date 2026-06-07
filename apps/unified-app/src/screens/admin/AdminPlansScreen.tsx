import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Screen, colors } from '@prime/ui';

import { useGetPlansQuery } from '@/store/api/endpoints';

export function AdminPlansScreen() {
  const { data } = useGetPlansQuery();

  return (
    <Screen padded={false}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No plans — run seed migration</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text>₹{item.price}</Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  name: { fontWeight: '600' },
  empty: { padding: 16, color: colors.textSecondary },
});

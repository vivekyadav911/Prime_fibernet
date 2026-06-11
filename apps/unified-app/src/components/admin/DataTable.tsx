import type { ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export type DataTableColumn<T> = {
  key: string;
  header: string;
  width?: number;
  render: (row: T) => ReactNode;
  sortable?: boolean;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowPress?: (row: T) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  ListEmptyComponent?: ReactNode;
};

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowPress,
  sortKey,
  onSort,
  ListEmptyComponent,
}: DataTableProps<T>) {
  return (
    <View>
      <View style={styles.headerRow}>
        {columns.map((col) => (
          <Pressable
            key={col.key}
            style={[styles.headerCell, col.width ? { width: col.width } : { flex: 1 }]}
            onPress={col.sortable && onSort ? () => onSort(col.key) : undefined}
          >
            <Text style={styles.headerText}>
              {col.header}
              {sortKey === col.key ? ' ↕' : ''}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent as React.ComponentType | null}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={onRowPress ? () => onRowPress(item) : undefined}
            disabled={!onRowPress}
          >
            {columns.map((col) => (
              <View key={col.key} style={[styles.cell, col.width ? { width: col.width } : { flex: 1 }]}>
                {col.render(item)}
              </View>
            ))}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  headerCell: { paddingHorizontal: spacing.xs },
  headerText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
  },
  cell: { paddingHorizontal: spacing.xs },
});

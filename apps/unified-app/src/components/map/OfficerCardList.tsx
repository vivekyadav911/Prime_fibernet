import { FlatList, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { OfficerLocation } from '@/types/map';

import { OfficerCard } from './OfficerCard';

type Props = {
  officers: OfficerLocation[];
  onSelect: (officer: OfficerLocation) => void;
};

export function OfficerCardList({ officers, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Officers ({officers.length})</Text>
      <FlatList
        horizontal
        data={officers}
        keyExtractor={(item) => item.officer_id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <OfficerCard
            officer={item}
            colorIndex={index}
            onPress={() => onSelect(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  list: { paddingHorizontal: spacing.md },
});

import { Dimensions, StyleSheet, Text, View } from 'react-native';

import { useRequestCounts } from '@/hooks/officer';
import { formatINR } from '@/utils/currencyFormat';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';

const TILE_WIDTH = (Dimensions.get('window').width - spacing.md * 2 - spacing.sm * 3) / 4;

type StatTileProps = {
  value: string;
  label: string;
};

function StatTile({ value, label }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function StatsRow() {
  const { newRequests, activeRequests, resolvedToday, collectionsToday, isLoading } =
    useRequestCounts();

  if (isLoading) {
    return (
      <View style={styles.row}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.tile, styles.skeleton]} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <StatTile value={String(newRequests)} label="New Reqs" />
      <StatTile value={String(activeRequests)} label="Active" />
      <StatTile value={String(resolvedToday)} label="Done Today" />
      <StatTile
        value={collectionsToday >= 1000 ? `₹${(collectionsToday / 1000).toFixed(1)}K` : formatINR(collectionsToday)}
        label="Today Coll."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tile: {
    width: TILE_WIDTH,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.sm,
    alignItems: 'center',
    minHeight: 72,
    justifyContent: 'center',
    ...shadow.card,
  },
  skeleton: { backgroundColor: colors.borderDefault, opacity: 0.3 },
  value: { fontSize: 20, fontWeight: '700', color: colors.primaryNavy },
  label: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
});

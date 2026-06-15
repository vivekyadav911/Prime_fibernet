import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ServiceRequest } from '@prime/types';

import { PriorityBadge } from '@/components/common';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';
import type { OfficerStackParamList } from '@/types/navigation';

import { NavigationButton } from './NavigationButton';

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

type AssignmentPreviewListProps = {
  requests: ServiceRequest[] | undefined;
  limit?: number;
};

export function AssignmentPreviewList({ requests, limit = 3 }: AssignmentPreviewListProps) {
  const navigation = useNavigation<NativeStackNavigationProp<OfficerStackParamList>>();

  const preview = useMemo(() => {
    return [...(requests ?? [])]
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9))
      .slice(0, limit);
  }, [limit, requests]);

  const openDetail = useCallback(
    (requestId: string) => navigation.navigate('RequestDetail', { requestId }),
    [navigation],
  );

  if (!preview.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Today&apos;s Assignments</Text>
        <Pressable
          onPress={() =>
            navigation.getParent()?.navigate('RequestsStack' as never)
          }
          style={styles.viewAll}
        >
          <Text style={styles.viewAllText}>View All →</Text>
        </Pressable>
      </View>
      {preview.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <PriorityBadge priority={item.priority} />
            <Text style={styles.type}>{item.requestType}</Text>
          </View>
          <Text style={styles.desc} numberOfLines={2}>
            {item.description ?? item.address}
          </Text>
          <Text style={styles.address} numberOfLines={1}>
            {item.address}
          </Text>
          <View style={styles.actions}>
            <NavigationButton address={item.address} />
            <Pressable style={styles.openBtn} onPress={() => openDetail(item.id)}>
              <Text style={styles.openText}>Open</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.primaryNavy },
  viewAll: { minHeight: 48, justifyContent: 'center' },
  viewAllText: { color: colors.accentTeal, fontWeight: '600', fontSize: 14 },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  type: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  desc: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xxs },
  address: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  openBtn: {
    minHeight: 48,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentTeal,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
  },
  openText: { color: colors.white, fontWeight: '700' },
});

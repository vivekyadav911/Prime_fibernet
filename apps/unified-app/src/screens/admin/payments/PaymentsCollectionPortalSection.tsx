import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DashboardCollectionKpiSection } from '@/screens/admin/DashboardScreen/components/DashboardCollectionKpiSection';
import { CollectionActivityTicker } from '@/screens/admin/DashboardScreen/components/CollectionActivityTicker';
import type { AdminPaymentsStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export function PaymentsCollectionPortalSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminPaymentsStackParamList>>();

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Collection portal</Text>
          <Text style={styles.subtitle}>Assign officers, track collections, and manage the open pool</Text>
        </View>
        <Pressable
          style={styles.cta}
          onPress={() => navigation.navigate('CollectionAssignments')}
        >
          <Text style={styles.ctaText}>Manage</Text>
        </Pressable>
      </View>
      <DashboardCollectionKpiSection />
      <CollectionActivityTicker />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cta: {
    backgroundColor: adminColors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ctaText: {
    color: colors.surfaceWhite,
    fontWeight: '700',
    fontSize: 13,
  },
});

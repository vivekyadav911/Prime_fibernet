import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ServiceRequest } from '@prime/types';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { EmptyState, ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import { useOfficerProfile } from '@/hooks/officer';
import { useAppSelector } from '@/store/hooks';
import { useGetAssignedRequestsQuery } from '@/store/api/endpoints';
import type { OfficerStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

import { AssignmentPreviewList } from './components/AssignmentPreviewList';
import { AttendanceWidget } from './components/AttendanceWidget';
import { EarningsWidget } from './components/EarningsWidget';
import { ShiftClockWidget } from './components/ShiftClockWidget';
import { StatsRow } from './components/StatsRow';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function OfficerDashboardScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { profile } = useOfficerProfile();
  const navigation = useNavigation<NativeStackNavigationProp<OfficerStackParamList>>();
  const { data: requests, isLoading, isError, error, refetch } = useGetAssignedRequestsQuery(
    user?.id,
    { skip: !user?.id },
  );

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const onViewAllRequests = useCallback(() => {
    navigation.getParent()?.navigate('RequestsStack' as never);
  }, [navigation]);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <SkeletonLoader rows={4} tall />
      </ScreenWrapper>
    );
  }

  if (isError) {
    return (
      <ScreenWrapper>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </ScreenWrapper>
    );
  }

  const hasAssignments = (requests?.length ?? 0) > 0;

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {greeting()}, {profile?.name?.split(' ')[0] ?? user?.name ?? 'Officer'} 👋
        </Text>
        <Text style={styles.date}>{todayLabel}</Text>
        {profile?.zone ? <Text style={styles.zone}>📍 {profile.zone}</Text> : null}
      </View>

      <ShiftClockWidget />
      <StatsRow />

      {hasAssignments ? (
        <AssignmentPreviewList requests={requests} />
      ) : (
        <EmptyState
          title="No assignments"
          subtitle="New requests will appear here"
          icon="📋"
          actionLabel="View requests"
          onAction={onViewAllRequests}
        />
      )}

      <Text style={styles.sectionTitle}>This Month</Text>
      <View style={styles.monthRow}>
        <EarningsWidget />
        <View style={styles.gap} />
        <AttendanceWidget />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md },
  greeting: { fontSize: 20, fontWeight: '700', color: colors.primaryNavy },
  date: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xxs },
  zone: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xxs },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryNavy,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  monthRow: { flexDirection: 'row', marginBottom: spacing.lg },
  gap: { width: spacing.sm },
});

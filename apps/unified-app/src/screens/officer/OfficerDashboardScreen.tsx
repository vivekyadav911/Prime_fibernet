import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ContractSignaturePromptCard } from '@/components/officer/ContractSignaturePromptCard';
import { ContractSignaturePromptModal } from '@/components/officer/ContractSignaturePromptModal';
import { EmptyState, ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import {
  contractSignaturePromptKey,
  useOfficerProfile,
  usePendingContractSignature,
} from '@/hooks/officer';
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

const dismissedPromptKeys = new Set<string>();

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
  const {
    contract,
    needsSignature,
    refetch: refetchContract,
    navigateToSign,
    navigateToContractPdf,
  } = usePendingContractSignature();
  const { data: requests, isLoading, isError, error, refetch } = useGetAssignedRequestsQuery(
    user?.id,
    { skip: !user?.id },
  );

  const [modalVisible, setModalVisible] = useState(false);
  const lastPromptKeyRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refetchContract();
    }, [refetchContract]),
  );

  useEffect(() => {
    if (!needsSignature || !contract) {
      setModalVisible(false);
      return;
    }

    const key = contractSignaturePromptKey(contract);
    if (dismissedPromptKeys.has(key)) {
      setModalVisible(false);
      return;
    }

    if (lastPromptKeyRef.current !== key) {
      lastPromptKeyRef.current = key;
      setModalVisible(true);
    }
  }, [needsSignature, contract]);

  const handleRemindLater = useCallback(() => {
    if (contract) {
      dismissedPromptKeys.add(contractSignaturePromptKey(contract));
    }
    setModalVisible(false);
  }, [contract]);

  const handleSignNow = useCallback(() => {
    if (contract) {
      dismissedPromptKeys.add(contractSignaturePromptKey(contract));
    }
    setModalVisible(false);
    navigateToSign();
  }, [contract, navigateToSign]);

  const handleViewPdf = useCallback(() => {
    if (contract) {
      navigateToContractPdf(contract);
    }
  }, [contract, navigateToContractPdf]);

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

      {needsSignature && contract ? (
        <ContractSignaturePromptCard
          contract={contract}
          onSignNow={handleSignNow}
          onViewPdf={handleViewPdf}
        />
      ) : null}

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

      <ContractSignaturePromptModal
        visible={modalVisible}
        onSignNow={handleSignNow}
        onRemindLater={handleRemindLater}
      />
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

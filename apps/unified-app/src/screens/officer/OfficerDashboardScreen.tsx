import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ContractSignaturePromptCard } from '@/components/officer/ContractSignaturePromptCard';
import { ContractSignaturePromptModal } from '@/components/officer/ContractSignaturePromptModal';
import { ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import {
  contractSignaturePromptKey,
  useOfficerProfile,
  usePendingContractSignature,
} from '@/hooks/officer';
import { useAppSelector } from '@/store/hooks';
import { useOfficerDashboardStats } from '@/hooks/officer';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

import { AssignmentPreviewList } from './components/AssignmentPreviewList';
import { AttendanceWidget } from './components/AttendanceWidget';
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
  const {
    contract,
    needsSignature,
    refetch: refetchContract,
    navigateToSign,
    navigateToContractPdf,
  } = usePendingContractSignature();
  const { items, isLoading, isError, error, refetch } = useOfficerDashboardStats(user?.id);

  const [modalVisible, setModalVisible] = useState(false);
  const lastPromptKeyRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refetchContract();
      void refetch();
      const timer = setInterval(() => {
        void refetch();
      }, 20_000);
      return () => clearInterval(timer);
    }, [refetch, refetchContract]),
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

  if (isLoading && items == null) {
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

      <AssignmentPreviewList items={items} />

      <Text style={styles.sectionTitle}>This Month</Text>
      <AttendanceWidget />

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
});

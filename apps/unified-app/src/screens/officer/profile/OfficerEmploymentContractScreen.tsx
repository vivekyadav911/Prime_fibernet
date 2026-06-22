import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { StatusBadge } from '@/components/admin';
import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { SignaturePadSheet } from '@/components/common/SignaturePadSheet';
import { useCompanyDefaults } from '@/hooks/useCompanyDefaults';
import { useContractPDF } from '@/hooks/useContractPDF';
import { useMyEmploymentContract } from '@/hooks/useEmploymentContract';
import type { OfficerProfileStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { formatCurrencyInr } from '@/utils/formatCurrency';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<OfficerProfileStackParamList, 'EmploymentContract'>;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB');
}

export function OfficerEmploymentContractScreen({ route, navigation }: Props) {
  const highlightSign = route.params?.highlightSign ?? false;
  const { savedDefaults } = useCompanyDefaults();
  const { contract, isLoading, isError, error, refetch, submitMySignature, submittingSignature } =
    useMyEmploymentContract();
  const { shareFromStoragePath } = useContractPDF();
  const [signPadVisible, setSignPadVisible] = useState(false);

  const needsSignature = !!contract?.generatedPdfUrl && !contract.employeeSignaturePath;

  useEffect(() => {
    if (highlightSign && needsSignature) {
      setSignPadVisible(true);
    }
  }, [highlightSign, needsSignature]);

  const handleDownload = useCallback(async () => {
    if (!contract?.generatedPdfUrl) {
      Alert.alert('No PDF', 'Your contract PDF is not available yet.');
      return;
    }
    try {
      await shareFromStoragePath(contract.generatedPdfUrl, 'Employment Contract');
    } catch (e) {
      Alert.alert('Download failed', queryErrorMessage(e));
    }
  }, [contract, shareFromStoragePath]);

  const handleViewPdf = useCallback(() => {
    if (!contract?.generatedPdfUrl) return;
    navigation.navigate('ContractPdfViewer', {
      storagePath: contract.generatedPdfUrl,
      title: 'Employment Contract',
    });
  }, [contract, navigation]);

  const handleSignConfirm = useCallback(
    async (signatureBase64: string) => {
      if (!contract) return;
      try {
        await submitMySignature(contract, signatureBase64, savedDefaults ?? null);
        setSignPadVisible(false);
        Alert.alert('Signed', 'Your signature has been saved.');
      } catch (e) {
        Alert.alert('Sign failed', queryErrorMessage(e));
      }
    },
    [contract, savedDefaults, submitMySignature],
  );

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={5} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  if (!contract) {
    return (
      <Screen>
        <EmptyState
          title="No contract on file"
          subtitle="Your employment contract will appear here once it has been created by HR."
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      {needsSignature ? (
        <Pressable style={styles.banner} onPress={() => setSignPadVisible(true)}>
          <Text style={styles.bannerTitle}>Signature required</Text>
          <Text style={styles.bannerBody}>Tap to review and sign your employment contract.</Text>
        </Pressable>
      ) : null}

      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Employment Contract</Text>
          <StatusBadge status={contract.status} />
        </View>
        <Text style={styles.row}>Designation: {contract.employeeDesignation}</Text>
        <Text style={styles.row}>Date of joining: {formatDate(contract.dateOfJoining)}</Text>
        <Text style={styles.row}>Annual CTC: {formatCurrencyInr(contract.ctcAnnual)}</Text>
        <Text style={styles.row}>Work location: {contract.workLocation}</Text>
        {contract.employeeSignedAt ? (
          <Text style={styles.signed}>You signed on {formatDate(contract.employeeSignedAt)}</Text>
        ) : null}
        {contract.generatedPdfUrl ? (
          <View style={styles.actions}>
            <Button label="View PDF" variant="secondary" onPress={handleViewPdf} />
            <Button label="Share PDF" variant="secondary" onPress={() => void handleDownload()} />
            {needsSignature ? (
              <Button label="Sign Contract" onPress={() => setSignPadVisible(true)} />
            ) : null}
          </View>
        ) : (
          <Text style={styles.pending}>PDF not generated yet.</Text>
        )}
      </View>

      <SignaturePadSheet
        visible={signPadVisible}
        title="Your signature"
        onClose={() => setSignPadVisible(false)}
        onConfirm={handleSignConfirm}
        submitting={submittingSignature}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, gap: spacing.md },
  banner: {
    backgroundColor: colors.primaryNavy,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  bannerTitle: { color: colors.white, fontWeight: '700', fontSize: 15, marginBottom: spacing.xxs },
  bannerBody: { color: colors.white, fontSize: 13, opacity: 0.9 },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  row: { fontSize: 14, color: colors.textSecondary },
  signed: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  pending: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
});

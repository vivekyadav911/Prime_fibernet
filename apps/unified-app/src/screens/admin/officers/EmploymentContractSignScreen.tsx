import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';


import { AdminScreenLayout, RoleGuard, useAdminPermission } from '@/components/admin';
import { SignaturePadSheet } from '@/components/common/SignaturePadSheet';
import { useCompanyDefaults } from '@/hooks/useCompanyDefaults';
import { useEmploymentContract } from '@/hooks/useEmploymentContract';
import type { AdminOfficersStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminOfficersStackParamList, 'EmploymentContractSign'>;

export function EmploymentContractSignScreen({ route, navigation }: Props) {
  const { contractId, officerId } = route.params;
  const canEdit = useAdminPermission('officers.edit');
  const { savedDefaults } = useCompanyDefaults();
  const { contract, isLoading, submitContractSignature, submittingSignature, refetch } =
    useEmploymentContract(officerId);
  const [padVisible, setPadVisible] = useState(true);

  const handleConfirm = useCallback(
    async (signatureBase64: string) => {
      if (!contract || contract.id !== contractId) {
        Alert.alert('Error', 'Contract not found.');
        return;
      }
      if (contract.employerSignaturePath) {
        Alert.alert('Already signed', 'Company signature is already on file.');
        navigation.goBack();
        return;
      }
      try {
        await submitContractSignature(contract, 'employer', signatureBase64, savedDefaults ?? null);
        await refetch();
        Alert.alert('Signed', 'Company signature saved.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } catch (e) {
        Alert.alert('Sign failed', queryErrorMessage(e));
      }
    },
    [contract, contractId, navigation, refetch, savedDefaults, submitContractSignature],
  );

  if (!canEdit) {
    return <RoleGuard requiredPermission="officers.edit">{null}</RoleGuard>;
  }

  return (
    <RoleGuard requiredPermission="officers.edit">
      <AdminScreenLayout>
        <View style={styles.card}>
          <Text style={styles.title}>Sign for Company</Text>
          <Text style={styles.subtitle}>
            {isLoading
              ? 'Loading contract…'
              : contract
                ? `Authorizing signature for ${contract.employeeFullName}'s employment contract.`
                : 'Contract not found.'}
          </Text>
        </View>

        <SignaturePadSheet
          visible={padVisible && !isLoading && !!contract}
          title="Company signature"
          onClose={() => {
            setPadVisible(false);
            navigation.goBack();
          }}
          onConfirm={handleConfirm}
          submitting={submittingSignature}
        />
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  padded: { padding: spacing.md },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
});

import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';

import { useGetMyEmploymentContractQuery } from '@/services/api/employmentContractsApi';
import { navigateToOfficerProfile } from '@/navigation/officerShellNavigation';
import type { EmploymentContract } from '@/types/contract';

export function usePendingContractSignature() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { data: contract, isLoading, isError, error, refetch } = useGetMyEmploymentContractQuery();

  const needsSignature = useMemo(
    () => !!contract?.generatedPdfUrl && !contract?.employeeSignaturePath,
    [contract],
  );

  const navigateToSign = useCallback(() => {
    navigateToOfficerProfile(navigation, {
      screen: 'EmploymentContract',
      params: { highlightSign: true },
    });
  }, [navigation]);

  const navigateToContract = useCallback(() => {
    navigateToOfficerProfile(navigation, {
      screen: 'EmploymentContract',
    });
  }, [navigation]);

  const navigateToContractPdf = useCallback(
    (target: EmploymentContract) => {
      if (!target.generatedPdfUrl) return;
      navigateToOfficerProfile(navigation, {
        screen: 'ContractPdfViewer',
        params: {
          storagePath: target.generatedPdfUrl,
          title: 'Employment Contract',
        },
      });
    },
    [navigation],
  );

  return {
    contract,
    needsSignature,
    isLoading,
    isError,
    error,
    refetch,
    navigateToSign,
    navigateToContract,
    navigateToContractPdf,
  };
}

export function contractSignaturePromptKey(contract: EmploymentContract): string {
  return `${contract.id}:${contract.signatureRequestSentAt ?? 'pending'}`;
}

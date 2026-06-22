import { useCallback, useMemo } from 'react';
import { CommonActions, useNavigation } from '@react-navigation/native';

import { useGetMyEmploymentContractQuery } from '@/services/api/employmentContractsApi';
import type { EmploymentContract } from '@/types/contract';

export function usePendingContractSignature() {
  const navigation = useNavigation();
  const { data: contract, isLoading, isError, error, refetch } = useGetMyEmploymentContractQuery();

  const needsSignature = useMemo(
    () => !!contract?.generatedPdfUrl && !contract?.employeeSignaturePath,
    [contract],
  );

  const navigateToSign = useCallback(() => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'ProfileStack',
        params: {
          screen: 'EmploymentContract',
          params: { highlightSign: true },
        },
      }),
    );
  }, [navigation]);

  const navigateToContract = useCallback(() => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'ProfileStack',
        params: {
          screen: 'EmploymentContract',
        },
      }),
    );
  }, [navigation]);

  const navigateToContractPdf = useCallback(
    (target: EmploymentContract) => {
      if (!target.generatedPdfUrl) return;
      navigation.dispatch(
        CommonActions.navigate({
          name: 'ProfileStack',
          params: {
            screen: 'ContractPdfViewer',
            params: {
              storagePath: target.generatedPdfUrl,
              title: 'Employment Contract',
            },
          },
        }),
      );
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

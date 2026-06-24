import { useCallback, useMemo } from 'react';

import {
  useGetCompanyContractDefaultsQuery,
  useSaveCompanyContractDefaultsMutation,
} from '@/services/api/employmentContractsApi';
import { useGetAppSettingsQuery } from '@/store/api/endpoints';
import type { CompanyDefaults } from '@/types/contract';

export function useCompanyDefaults() {
  const { data: defaults, isLoading: defaultsLoading, refetch } = useGetCompanyContractDefaultsQuery();
  const { data: appSettings, isLoading: settingsLoading } = useGetAppSettingsQuery();
  const [saveDefaults, { isLoading: saving }] = useSaveCompanyContractDefaultsMutation();

  const effectiveDefaults = useMemo((): Partial<CompanyDefaults> & {
    companyName: string;
    companyAddress: string;
  } => {
    if (defaults) return defaults;

    const parts = [appSettings?.officeAddress].filter(Boolean);

    return {
      companyName: appSettings?.companyName ?? '',
      companyAddress: parts.join(', '),
      companyCin: null,
      companyPan: null,
      defaultSignatoryName: null,
      defaultSignatoryDesignation: null,
      logoUrl: null,
      defaultGoverningLaw: 'Courts of [City], India',
    };
  }, [defaults, appSettings]);

  const save = useCallback(
    async (input: Omit<CompanyDefaults, 'updatedAt'>) => {
      return saveDefaults({
        id: input.id,
        companyName: input.companyName,
        companyAddress: input.companyAddress,
        companyCin: input.companyCin,
        companyPan: input.companyPan,
        defaultSignatoryName: input.defaultSignatoryName,
        defaultSignatoryDesignation: input.defaultSignatoryDesignation,
        logoUrl: input.logoUrl,
        defaultGoverningLaw: input.defaultGoverningLaw,
      }).unwrap();
    },
    [saveDefaults],
  );

  return {
    defaults: effectiveDefaults,
    savedDefaults: defaults,
    isLoading: defaultsLoading || settingsLoading,
    saving,
    refetch,
    saveDefaults: save,
  };
}

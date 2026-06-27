import {
  useCreateCompanyHolidayMutation,
  useDeleteCompanyHolidayMutation,
  useUpdateCompanyHolidayMutation,
  useGetCompanyHolidaysQuery,
  useGetEmployeeCompensationsQuery,
  useGetLabelThresholdsQuery,
  useGetPayTypeRulesQuery,
  useUpdateLabelThresholdMutation,
  useUpdatePayTypeRuleMutation,
  useUpsertEmployeeCompensationMutation,
} from '@/services/api/payrollApi';

export function usePayslipSettings(year?: number) {
  const payTypeRules = useGetPayTypeRulesQuery();
  const labelThresholds = useGetLabelThresholdsQuery();
  const companyHolidays = useGetCompanyHolidaysQuery({ year });
  const compensations = useGetEmployeeCompensationsQuery();

  const [updatePayTypeRule] = useUpdatePayTypeRuleMutation();
  const [updateLabelThreshold] = useUpdateLabelThresholdMutation();
  const [createHoliday] = useCreateCompanyHolidayMutation();
  const [updateHoliday] = useUpdateCompanyHolidayMutation();
  const [deleteHoliday] = useDeleteCompanyHolidayMutation();
  const [upsertCompensation] = useUpsertEmployeeCompensationMutation();

  const isLoading =
    payTypeRules.isLoading ||
    labelThresholds.isLoading ||
    companyHolidays.isLoading ||
    compensations.isLoading;

  const isError =
    payTypeRules.isError ||
    labelThresholds.isError ||
    companyHolidays.isError ||
    compensations.isError;

  return {
    payTypeRules: payTypeRules.data ?? [],
    labelThresholds: labelThresholds.data ?? [],
    companyHolidays: companyHolidays.data ?? [],
    compensations: compensations.data ?? [],
    isLoading,
    isError,
    refetch: () => {
      void payTypeRules.refetch();
      void labelThresholds.refetch();
      void companyHolidays.refetch();
      void compensations.refetch();
    },
    updatePayTypeRule,
    updateLabelThreshold,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    upsertCompensation,
  };
}

import {
  useGetMyPlanChangeRequestsQuery,
  useSubmitPlanChangeRequestMutation,
} from '@/services/api/customerPlansApi';

export function usePlanChangeRequest() {
  const { data, isLoading, error, refetch } = useGetMyPlanChangeRequestsQuery();
  const [submit, submitState] = useSubmitPlanChangeRequestMutation();

  return {
    myRequests: data ?? [],
    isLoading,
    error,
    refetch,
    submitRequest: submit,
    isSubmitting: submitState.isLoading,
    submitError: submitState.error,
  };
}

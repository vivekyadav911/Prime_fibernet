import { useClaimCollectionCustomerMutation } from '@/services/api/paymentCollectionApi';

export function useClaimCollection() {
  const [claim, state] = useClaimCollectionCustomerMutation();
  return { claim, ...state };
}

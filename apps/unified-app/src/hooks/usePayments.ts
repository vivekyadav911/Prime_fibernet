import { useMemo } from 'react';

import {
  useCreatePaymentOrderV2Mutation,
  useGetCollectionDashboardKpisQuery,
  useGetCustomerBillQuery,
  useGetCustomerCollectionHistoryQuery,
  useGetCustomerPaymentHistoryV2Query,
  useGetGatewaysQuery,
  useGetOfficerCollectionsQuery,
  useGetPaymentAnalyticsV2Query,
  useGetPaymentDetailQuery,
  useGetPaymentsQuery,
  useGetRecentOfficerCollectionsQuery,
  useSaveGatewayCredentialsMutation,
} from '@/services/api/paymentCollectionApi';
import type { PaymentFilters } from '@/types/payments';

export function usePayments(filters?: PaymentFilters) {
  return useGetPaymentsQuery(filters);
}

export function usePaymentDetail(paymentId: string) {
  return useGetPaymentDetailQuery(paymentId, { skip: !paymentId });
}

export function usePaymentAnalytics(dateFrom?: string, dateTo?: string) {
  return useGetPaymentAnalyticsV2Query({ dateFrom, dateTo });
}

export function useGateways() {
  const query = useGetGatewaysQuery();
  const [saveCredentials, saveState] = useSaveGatewayCredentialsMutation();
  return { ...query, saveCredentials, saveState };
}

export function useCustomerPayments(customerId: string) {
  const bill = useGetCustomerBillQuery(customerId, { skip: !customerId });
  const history = useGetCustomerPaymentHistoryV2Query(customerId, { skip: !customerId });
  const [createOrder, orderState] = useCreatePaymentOrderV2Mutation();

  const summary = useMemo(() => bill.data ?? null, [bill.data]);

  return { bill, history, createOrder, orderState, summary };
}

export function useOfficerCollections() {
  return useGetOfficerCollectionsQuery();
}

export function useCollectionDashboardKpis() {
  return useGetCollectionDashboardKpisQuery();
}

export function useCustomerCollectionHistory(customerId: string) {
  return useGetCustomerCollectionHistoryQuery(customerId, { skip: !customerId });
}

export function useRecentOfficerCollections(limit = 10) {
  return useGetRecentOfficerCollectionsQuery(limit);
}

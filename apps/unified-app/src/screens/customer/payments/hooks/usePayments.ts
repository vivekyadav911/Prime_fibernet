import { useMemo, useState } from 'react';

import type { Payment, PaymentGateway } from '@prime/types';

import { useCustomerIdentity } from '@/hooks/useCustomerIdentity';
import {
  useCreatePaymentOrderMutation,
  useGetActiveSubscriptionQuery,
  useLazyGetInvoiceUrlQuery,
  useGetPaymentHistoryQuery,
  useVerifyPaymentMutation,
} from '@/store/api/endpoints';

export type DateRangeKey = '30d' | '3m' | '6m' | 'all';

function rangeStart(key: DateRangeKey): Date | null {
  const now = new Date();
  switch (key) {
    case '30d':
      return new Date(now.getTime() - 30 * 86400000);
    case '3m':
      return new Date(now.getTime() - 90 * 86400000);
    case '6m':
      return new Date(now.getTime() - 180 * 86400000);
    case 'all':
    default:
      return null;
  }
}

export function usePayments() {
  const { authUser: user, userId } = useCustomerIdentity();

  const historyQuery = useGetPaymentHistoryQuery(userId, { skip: !userId });
  const subscriptionQuery = useGetActiveSubscriptionQuery(userId, { skip: !userId });
  const [createOrder] = useCreatePaymentOrderMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [getInvoice] = useLazyGetInvoiceUrlQuery();

  const [dateRange, setDateRange] = useState<DateRangeKey>('all');

  const filteredPayments = useMemo(() => {
    const start = rangeStart(dateRange);
    const list = historyQuery.data ?? [];
    if (!start) return list;
    return list.filter((p) => new Date(p.createdAt) >= start);
  }, [historyQuery.data, dateRange]);

  const totalSpent = useMemo(
    () =>
      filteredPayments
        .filter((p) => p.paymentStatus === 'success')
        .reduce((sum, p) => sum + p.amount, 0),
    [filteredPayments],
  );

  const failedPayments = useMemo(
    () => filteredPayments.filter((p) => p.paymentStatus === 'failed'),
    [filteredPayments],
  );

  const payRenewal = async (): Promise<{
    checkoutUrl: string | null;
    paymentId: string;
    orderId: string;
    gateway: PaymentGateway;
  }> => {
    if (!user) throw new Error('Sign in required');
    const sub = subscriptionQuery.data;
    if (!sub) throw new Error('No active subscription');
    const result = await createOrder({
      userId,
      userName: user.name,
      userEmail: user.email,
      planId: sub.planId,
      planName: sub.planName ?? 'Renewal',
      amount: 499,
    }).unwrap();
    return result;
  };

  const retryPayment = async (payment: Payment) => {
    if (!user) throw new Error('Sign in required');
    return createOrder({
      userId,
      userName: user.name,
      userEmail: user.email,
      planId: subscriptionQuery.data?.planId ?? payment.id,
      planName: 'Payment retry',
      amount: payment.amount,
    }).unwrap();
  };

  const downloadInvoice = async (paymentId: string, existingUrl?: string | null) => {
    if (existingUrl) return existingUrl;
    return getInvoice(paymentId).unwrap();
  };

  return {
    user,
    payments: filteredPayments,
    totalSpent,
    failedPayments,
    subscription: subscriptionQuery.data ?? null,
    dateRange,
    setDateRange,
    isLoading: historyQuery.isLoading,
    error: historyQuery.error,
    refetch: historyQuery.refetch,
    payRenewal,
    retryPayment,
    downloadInvoice,
    verifyPayment,
  };
}

import type { Payment, PaymentGateway, PaymentOrderResponse, PaymentStatus } from '@prime/types';

import { baseApi } from './baseApi';

export type InvoiceDetail = {
  id: string;
  invoiceNumber: string | null;
  customerName: string;
  planName: string | null;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  paymentMethod: string | null;
  createdAt: string;
};

export type PaymentLedgerEntry = {
  id: string;
  userId: string;
  userName: string;
  planName: string | null;
  amount: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  createdAt: string;
  invoiceNumber: string | null;
};

function mapPayment(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    amount: Number(row.amount),
    paymentStatus: (row.payment_status as Payment['paymentStatus']) ?? 'pending',
    transactionId: (row.gateway_transaction_id ?? row.transaction_id ?? null) as string | null,
    invoiceUrl: (row.invoice_url ?? null) as string | null,
    createdAt: row.created_at as string,
  };
}

/** @deprecated Use paymentCollectionApi — queries legacy user_payments table */
export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPaymentHistory: builder.query<Payment[], string>({
      query: (userId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('user_payments')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) throw error;
          return (data ?? []).map((row) => mapPayment(row as Record<string, unknown>));
        },
      }),
      providesTags: ['Payments'],
    }),

    getPendingPayments: builder.query<Payment[], string>({
      query: (userId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('user_payments')
            .select('*')
            .eq('user_id', userId)
            .eq('payment_status', 'pending')
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => mapPayment(row as Record<string, unknown>));
        },
      }),
      providesTags: ['Payments'],
    }),

    createSelfPayment: builder.mutation<
      Payment,
      {
        userId: string;
        userName: string;
        amount: number;
        paymentMethod: string;
        userEmail?: string;
        userPhone?: string;
        planName?: string;
        planPrice?: number;
        billingPeriodStart?: string;
        billingPeriodEnd?: string;
      }
    >({
      query: (body) => ({
        handler: async (client) => {
          const sessionUserId = (await client.auth.getUser()).data.user?.id ?? body.userId;
          const { data, error } = await client
            .from('user_payments')
            .insert({
              user_id: sessionUserId,
              user_name: body.userName,
              user_email: body.userEmail,
              user_phone: body.userPhone,
              amount: body.amount,
              payment_method: body.paymentMethod,
              payment_status: 'pending',
              plan_name: body.planName,
              plan_price: body.planPrice,
              billing_period_start: body.billingPeriodStart,
              billing_period_end: body.billingPeriodEnd,
              created_by: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();
          if (error) throw error;
          return mapPayment(data as Record<string, unknown>);
        },
      }),
      invalidatesTags: ['Payments'],
    }),

    createPaymentOrder: builder.mutation<
      PaymentOrderResponse,
      {
        userId: string;
        userName: string;
        userEmail: string;
        userPhone?: string;
        planId: string;
        planName: string;
        amount: number;
        billingCycle?: 'monthly' | 'quarterly' | 'annual';
      }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('create-payment-order', {
            body: {
              userId: body.userId,
              userName: body.userName,
              userEmail: body.userEmail,
              userPhone: body.userPhone ?? '',
              planId: body.planId,
              planName: body.planName,
              amount: body.amount,
              billingCycle: body.billingCycle ?? 'monthly',
              paymentMethod: 'gateway',
            },
          });
          if (error) throw error;
          const res = data as Record<string, unknown>;
          return {
            paymentId: String(res.paymentId ?? ''),
            orderId: String(res.orderId ?? ''),
            checkoutUrl: (res.checkoutUrl ?? res.paymentUrl ?? null) as string | null,
            gateway: (res.gateway ?? 'easybuzz') as PaymentGateway,
            amount: Number(res.amount ?? body.amount),
          };
        },
      }),
      invalidatesTags: ['Payments', 'Subscriptions'],
    }),

    initiateEasebuzzPayment: builder.mutation<
      Record<string, unknown>,
      {
        userId: string;
        userName: string;
        userEmail: string;
        userPhone: string;
        amount: number;
        planName?: string;
        planId?: string;
        txnid?: string;
        productInfoFallback?: string;
      }
    >({
      query: (body) => ({
        handler: async (client) => {
          const txnid = body.txnid ?? `PF${Date.now()}`;
          const { data, error } = await client.functions.invoke('easebuzz-initiate-payment', {
            body: {
              userId: body.userId,
              userName: body.userName,
              userEmail: body.userEmail,
              userPhone: body.userPhone,
              amount: body.amount.toString(),
              txnid,
              productinfo: body.planName ?? body.productInfoFallback ?? 'Prime Fibernet Internet Service',
              planName: body.planName,
              planId: body.planId,
              udf1: body.userId,
              udf2: body.planId ?? '',
              udf3: '',
            },
          });
          if (error) throw error;
          return (data ?? {}) as Record<string, unknown>;
        },
      }),
      invalidatesTags: ['Payments'],
    }),

    verifyPayment: builder.mutation<
      { success: boolean; status?: string },
      { paymentId: string; orderId?: string; gateway?: PaymentGateway; paymentResponse?: Record<string, unknown> }
    >({
      query: (body) => ({
        handler: async (client) => {
          if (body.paymentResponse?.success === true) {
            const detailed = body.paymentResponse.detailed_response as Record<string, unknown> | undefined;
            if (detailed) {
              const status = detailed.status as string | undefined;
              const { error } = await client
                .from('user_payments')
                .update({
                  payment_status: status === 'success' ? 'success' : 'failed',
                  gateway_transaction_id: (detailed.txnid ?? detailed.easepayid) as string | undefined,
                  upi_transaction_id: detailed.bank_ref_num as string | undefined,
                  collection_timestamp: status === 'success' ? new Date().toISOString() : null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', body.paymentId);
              if (error) throw error;
              return { success: status === 'success', status: status === 'success' ? 'success' : 'failed' };
            }
          }

          const { data, error } = await client.functions.invoke('verify-payment', {
            body: {
              paymentId: body.paymentId,
              orderId: body.orderId,
              gateway: body.gateway,
            },
          });
          if (error) throw error;
          return {
            success: Boolean((data as { success?: boolean })?.success),
            status: (data as { status?: string })?.status,
          };
        },
      }),
      invalidatesTags: ['Payments', 'Subscriptions'],
    }),

    confirmPayment: builder.mutation<
      void,
      {
        paymentId: string;
        upiTransactionId?: string;
        upiReferenceId?: string;
        paymentGateway?: string;
        gatewayTransactionId?: string;
      }
    >({
      query: ({ paymentId, ...fields }) => ({
        handler: async (client) => {
          const updates: Record<string, unknown> = {
            payment_status: 'success',
            collection_timestamp: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            upi_transaction_id: fields.upiTransactionId,
            upi_reference_id: fields.upiReferenceId,
            payment_gateway: fields.paymentGateway,
            gateway_transaction_id: fields.gatewayTransactionId,
          };
          Object.keys(updates).forEach((key) => {
            if (updates[key] == null) delete updates[key];
          });
          const { error } = await client.from('user_payments').update(updates).eq('id', paymentId);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Payments', 'Subscriptions'],
    }),

    getPaymentStatus: builder.query<Record<string, unknown>, string>({
      query: (paymentId) => ({
        handler: async (client) => {
          const { data, error } = await client.from('user_payments').select('*').eq('id', paymentId).maybeSingle();
          if (error) throw error;
          if (!data) return { status: 'not_found', error: 'Payment record not found' };
          return {
            status: data.payment_status,
            amount: data.amount,
            paymentMethod: data.payment_method,
            gatewayTransactionId: data.gateway_transaction_id,
            upiTransactionId: data.upi_transaction_id,
          };
        },
      }),
      providesTags: ['Payments'],
    }),

    getInvoice: builder.query<InvoiceDetail, string>({
      query: (paymentId) => ({
        handler: async (client) => {
          const { data, error } = await client.from('user_payments').select('*').eq('id', paymentId).maybeSingle();
          if (error) throw error;
          if (!data) throw new Error('Invoice not found');
          const amount = Number(data.amount ?? 0);
          const gstAmount = Math.round(amount * 0.18 * 100) / 100;
          return {
            id: data.id as string,
            invoiceNumber: (data.invoice_number as string) ?? null,
            customerName: (data.user_name as string) ?? 'Customer',
            planName: (data.plan_name as string) ?? null,
            amount,
            gstAmount,
            totalAmount: amount,
            paymentMethod: (data.payment_method as string) ?? null,
            createdAt: data.created_at as string,
          };
        },
      }),
      providesTags: (_result, _error, paymentId) => [{ type: 'Payments', id: paymentId }],
    }),

    getAllPayments: builder.query<
      PaymentLedgerEntry[],
      { search?: string; status?: PaymentStatus | 'all'; method?: string; startDate?: string; endDate?: string } | void
    >({
      query: (filters) => ({
        handler: async (client) => {
          let query = client.from('user_payments').select('*').order('created_at', { ascending: false }).limit(200);
          if (filters?.status && filters.status !== 'all') {
            query = query.eq('payment_status', filters.status);
          }
          if (filters?.method && filters.method !== 'all') {
            query = query.eq('payment_method', filters.method);
          }
          if (filters?.startDate) query = query.gte('created_at', filters.startDate);
          if (filters?.endDate) query = query.lte('created_at', filters.endDate);
          const { data, error } = await query;
          if (error) throw error;
          let rows = (data ?? []).map((row) => ({
            id: row.id as string,
            userId: row.user_id as string,
            userName: (row.user_name as string) ?? 'Unknown',
            planName: (row.plan_name as string) ?? null,
            amount: Number(row.amount ?? 0),
            paymentMethod: (row.payment_method as string) ?? 'unknown',
            paymentStatus: (row.payment_status as PaymentStatus) ?? 'pending',
            createdAt: row.created_at as string,
            invoiceNumber: (row.invoice_number as string) ?? null,
          }));
          if (filters?.search?.trim()) {
            const q = filters.search.toLowerCase();
            rows = rows.filter(
              (r) =>
                r.userName.toLowerCase().includes(q) ||
                r.planName?.toLowerCase().includes(q) ||
                r.id.toLowerCase().includes(q),
            );
          }
          return rows;
        },
      }),
      providesTags: ['Payments'],
    }),

    getInvoiceUrl: builder.query<string, string>({
      query: (paymentId) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('invoice-generator', {
            body: { paymentId },
          });
          if (error) throw error;
          return String((data as { url?: string })?.url ?? '');
        },
      }),
    }),

    processRefund: builder.mutation<void, { paymentId: string; amount: number; reason: string }>({
      query: (body) => ({
        handler: async (client) => {
          const { error } = await client.functions.invoke('process-refund', { body });
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Payments'],
    }),
  }),
});

export const {
  useGetPaymentHistoryQuery,
  useGetPendingPaymentsQuery,
  useCreateSelfPaymentMutation,
  useCreatePaymentOrderMutation,
  useInitiateEasebuzzPaymentMutation,
  useVerifyPaymentMutation,
  useConfirmPaymentMutation,
  useGetPaymentStatusQuery,
  useGetInvoiceQuery,
  useGetAllPaymentsQuery,
  useGetInvoiceUrlQuery,
  useLazyGetInvoiceUrlQuery,
  useProcessRefundMutation,
} = paymentsApi;

/** Alias for checkout screens */
export const useCreateOrderMutation = useCreatePaymentOrderMutation;

/** Alias for admin refund flows */
export const useRefundMutation = useProcessRefundMutation;

import type { AdminInvoice } from '@/types/api/admin';

import { baseApi } from './baseApi';

export type ManualGstLineItem = {
  description: string;
  quantity: number;
  rate: number;
  gstPercent: number;
};

export const adminFinanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminInvoices: builder.query<
      AdminInvoice[],
      { page?: number; status?: string; from?: string; to?: string }
    >({
      query: (filters) => ({
        handler: async (client) => {
          let query = client.from('invoices').select('*').order('created_at', { ascending: false }).limit(200);
          if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
          if (filters?.from) query = query.gte('created_at', filters.from);
          if (filters?.to) query = query.lte('created_at', filters.to);
          const { data, error } = await query;
          if (error) {
            const { data: payments, error: payErr } = await client
              .from('user_payments')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(200);
            if (payErr) throw payErr;
            return (payments ?? []).map((row) => {
              const amount = Number(row.amount ?? 0);
              const gst = Math.round(amount * 0.18 * 100) / 100;
              return {
                id: row.id as string,
                invoiceNumber: (row.invoice_number as string) ?? `INV-${String(row.id).slice(0, 8)}`,
                customerName: (row.user_name as string) ?? 'Customer',
                amount,
                gstAmount: gst,
                totalAmount: amount + gst,
                date: row.created_at as string,
                status: row.payment_status === 'success' ? 'paid' as const : 'unpaid' as const,
              };
            });
          }
          return (data ?? []).map((row) => ({
            id: row.id as string,
            invoiceNumber: (row.invoice_number as string) ?? '',
            customerName: (row.customer_name as string) ?? 'Customer',
            amount: Number(row.amount ?? 0),
            gstAmount: Number(row.gst_amount ?? 0),
            totalAmount: Number(row.total_amount ?? 0),
            date: row.created_at as string,
            status: (row.status as AdminInvoice['status']) ?? 'unpaid',
          }));
        },
      }),
      providesTags: ['Payments'],
    }),

    downloadInvoice: builder.mutation<string, string>({
      query: (invoiceId) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('invoice-generator', {
            body: { paymentId: invoiceId },
          });
          if (error) throw error;
          return String((data as { url?: string })?.url ?? '');
        },
      }),
    }),

    sendInvoice: builder.mutation<void, { invoiceId: string; channel: 'email' | 'whatsapp' }>({
      query: ({ invoiceId, channel }) => ({
        handler: async (client) => {
          const { error } = await client.functions.invoke('send-invoice', {
            body: { invoiceId, channel },
          });
          if (error) throw error;
        },
      }),
    }),

    createManualGstInvoice: builder.mutation<
      { invoiceId: string },
      { customerId: string; lineItems: ManualGstLineItem[]; notes?: string }
    >({
      query: (body) => ({
        handler: async (client) => {
          const subtotal = body.lineItems.reduce((s, i) => s + i.quantity * i.rate, 0);
          const gst = body.lineItems.reduce(
            (s, i) => s + i.quantity * i.rate * (i.gstPercent / 100),
            0,
          );
          const { data, error } = await client
            .from('invoices')
            .insert({
              user_id: body.customerId,
              amount: subtotal,
              gst_amount: gst,
              total_amount: subtotal + gst,
              line_items: body.lineItems,
              notes: body.notes,
              status: 'unpaid',
              created_at: new Date().toISOString(),
            })
            .select('id')
            .single();
          if (error) throw error;
          return { invoiceId: data.id as string };
        },
      }),
      invalidatesTags: ['Payments'],
    }),
  }),
});

export const {
  useGetAdminInvoicesQuery,
  useDownloadInvoiceMutation,
  useSendInvoiceMutation,
  useCreateManualGstInvoiceMutation,
} = adminFinanceApi;

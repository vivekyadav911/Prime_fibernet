import type { AdminInvoice } from '@/types/api/admin';
import type {
  BulkSendInvoicesInput,
  BulkSendResult,
  CreateInvoiceInput,
  InvoiceListFilter,
  InvoiceRecord,
  InvoiceStats,
  InvoiceTypeFilter,
  SendInvoiceInput,
} from '@/types/invoice';
import { parseSupabaseFunctionError } from '@/utils/supabaseFunctionError';
import {
  computeInvoiceTotals,
  INVOICES_BUCKET,
  mapDbRowToInvoiceRecord,
  mapInvoiceRecordToAdminInvoice,
} from '@/utils/invoicePdf';

import { baseApi } from './baseApi';

export type GstInvoiceRequestStatus = 'pending' | 'processing' | 'issued' | 'rejected';

export type GstInvoiceRequestRecord = {
  id: string;
  paymentId: string;
  customerId: string;
  customerName: string;
  customerAccountId: string | null;
  customerPhone: string | null;
  paymentNumber: string | null;
  paymentAmount: number | null;
  paymentDate: string | null;
  gstin: string;
  businessName: string | null;
  billingAddress: string | null;
  status: GstInvoiceRequestStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapGstInvoiceRequestRow(row: Record<string, unknown>): GstInvoiceRequestRecord {
  const customer = row.customer as Record<string, unknown> | null | undefined;
  const payment = row.payment as Record<string, unknown> | null | undefined;
  return {
    id: String(row.id),
    paymentId: String(row.payment_id),
    customerId: String(row.customer_id),
    customerName: String(customer?.name ?? 'Customer'),
    customerAccountId: customer?.customer_id != null ? String(customer.customer_id) : null,
    customerPhone: customer?.phone != null ? String(customer.phone) : null,
    paymentNumber: payment?.payment_number != null ? String(payment.payment_number) : null,
    paymentAmount: payment?.total_amount != null ? Number(payment.total_amount) : null,
    paymentDate:
      payment?.confirmed_at != null
        ? String(payment.confirmed_at)
        : payment?.paid_at != null
          ? String(payment.paid_at)
          : null,
    gstin: String(row.gstin),
    businessName: row.business_name != null ? String(row.business_name) : null,
    billingAddress: row.billing_address != null ? String(row.billing_address) : null,
    status: row.status as GstInvoiceRequestStatus,
    adminNotes: row.admin_notes != null ? String(row.admin_notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

export type ManualGstLineItem = {
  description: string;
  quantity: number;
  rate: number;
  gstPercent: number;
};

type InvoiceQueryFilters = {
  page?: number;
  status?: string;
  listFilter?: InvoiceListFilter;
  invoiceType?: InvoiceTypeFilter;
  search?: string;
  from?: string;
  to?: string;
};

function mapLineItemsToDb(items: CreateInvoiceInput['lineItems']) {
  return items.map((item) => ({
    description: item.description,
    hsn_sac: item.hsnSac,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unitPrice,
    gst_rate: item.gstRate,
  }));
}

function applyListFilter<T extends { eq: (col: string, val: string) => T; in: (col: string, vals: string[]) => T }>(
  query: T,
  listFilter?: InvoiceListFilter,
): T {
  if (!listFilter || listFilter === 'all') return query;
  if (listFilter === 'pending') return query.eq('delivery_status', 'pending');
  if (listFilter === 'non_gst_sent') {
    return query.eq('delivery_status', 'sent').eq('invoice_type', 'non_gst');
  }
  if (listFilter === 'gst_sent') {
    return query.in('invoice_type', ['gst', 'custom_gst']).eq('delivery_status', 'sent');
  }
  return query;
}

async function fetchCompanySettings(client: import('@supabase/supabase-js').SupabaseClient) {
  const { data } = await client.from('general_settings').select('*').limit(1).maybeSingle();
  return {
    companyName: String(data?.company_name ?? 'Prime Fibernet'),
    companyAddress: [
      data?.company_address,
      data?.company_city,
      data?.company_state,
      data?.company_country,
    ]
      .filter(Boolean)
      .join(', '),
    companyPhone: String(data?.company_phone ?? ''),
    companyEmail: String(data?.company_email ?? 'invoices@dizitel.in'),
    companyGstin: String(data?.company_gstin ?? ''),
    companyState: String(data?.company_state ?? 'Uttar Pradesh'),
  };
}

export const adminFinanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminInvoices: builder.query<AdminInvoice[], InvoiceQueryFilters | void>({
      query: (filters) => ({
        handler: async (client) => {
          let query = client.from('invoices').select('*').order('created_at', { ascending: false }).limit(200);
          if (filters?.invoiceType && filters.invoiceType !== 'all') {
            query = query.eq('invoice_type', filters.invoiceType);
          }
          if (filters?.from) query = query.gte('created_at', filters.from);
          if (filters?.to) query = query.lte('created_at', filters.to);
          if (filters?.status && filters.status !== 'all') {
            if (['draft', 'pending', 'sent'].includes(filters.status)) {
              query = query.eq('delivery_status', filters.status);
            } else {
              query = query.eq('status', filters.status);
            }
          }
          query = applyListFilter(query, filters?.listFilter);
          const { data, error } = await query;
          if (error) throw error;
          let records = (data ?? []).map((row) =>
            mapInvoiceRecordToAdminInvoice(mapDbRowToInvoiceRecord(row as Record<string, unknown>)),
          );
          if (filters?.search?.trim()) {
            const q = filters.search.toLowerCase();
            records = records.filter(
              (i) =>
                i.customerName.toLowerCase().includes(q) ||
                i.invoiceNumber.toLowerCase().includes(q) ||
                (i.customerEmail?.toLowerCase().includes(q) ?? false),
            );
          }
          return records;
        },
      }),
      providesTags: ['Invoices'],
    }),

    getInvoiceStats: builder.query<InvoiceStats, void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.from('invoices').select('invoice_type, delivery_status, total_amount, status');
          if (error) throw error;
          const rows = data ?? [];
          const totalRevenue = rows.reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
          return {
            totalInvoices: rows.length,
            nonGstCount: rows.filter((r) => r.invoice_type === 'non_gst').length,
            gstCount: rows.filter((r) => r.invoice_type === 'gst').length,
            customGstCount: rows.filter((r) => r.invoice_type === 'custom_gst').length,
            totalRevenue,
            completedPayments: rows.filter((r) => r.status === 'paid' || r.delivery_status === 'sent').length,
            pendingCount: rows.filter((r) => r.delivery_status === 'pending').length,
          };
        },
      }),
      providesTags: ['Invoices'],
    }),

    getInvoiceById: builder.query<InvoiceRecord, string>({
      query: (invoiceId) => ({
        handler: async (client) => {
          const { data, error } = await client.from('invoices').select('*').eq('id', invoiceId).single();
          if (error) throw error;
          return mapDbRowToInvoiceRecord(data as Record<string, unknown>);
        },
      }),
      providesTags: (_r, _e, id) => [{ type: 'Invoices', id }],
    }),

    getInvoiceCompanySettings: builder.query<
      Awaited<ReturnType<typeof fetchCompanySettings>>,
      void
    >({
      query: () => ({
        handler: async (client) => fetchCompanySettings(client),
      }),
    }),

    getInvoiceSettings: builder.query<Record<string, unknown>, void>({
      query: () => ({
        handler: async (client) => {
          const { data } = await client.from('invoice_settings').select('setting_key, setting_value');
          const map: Record<string, unknown> = {};
          for (const row of data ?? []) {
            map[String(row.setting_key)] = row.setting_value;
          }
          return map;
        },
      }),
      providesTags: ['Invoices'],
    }),

    updateInvoiceSettings: builder.mutation<void, { key: string; value: unknown }>({
      query: ({ key, value }) => ({
        handler: async (client) => {
          const { data: existing } = await client
            .from('invoice_settings')
            .select('id')
            .eq('setting_key', key)
            .maybeSingle();
          if (existing?.id) {
            const { error } = await client
              .from('invoice_settings')
              .update({ setting_value: value, updated_at: new Date().toISOString() })
              .eq('id', existing.id);
            if (error) throw error;
          } else {
            const { error } = await client.from('invoice_settings').insert({
              setting_key: key,
              setting_value: value,
            });
            if (error) throw error;
          }
        },
      }),
      invalidatesTags: ['Invoices'],
    }),

    createInvoice: builder.mutation<{ invoiceId: string; invoice: InvoiceRecord }, CreateInvoiceInput>({
      query: (body) => ({
        handler: async (client) => {
          const totals = computeInvoiceTotals(body.lineItems, body.invoiceType);
          const { data: auth } = await client.auth.getUser();
          const { data: numRow } = await client.rpc('generate_invoice_number');
          const invoiceNumber = String(numRow ?? `INV-${Date.now()}`);
          const deliveryStatus = body.saveAsDraft ? 'draft' : 'pending';

          const { data, error } = await client
            .from('invoices')
            .insert({
              user_id: body.userId ?? null,
              invoice_number: invoiceNumber,
              invoice_type: body.invoiceType,
              delivery_status: deliveryStatus,
              delivery_channel: body.deliveryChannel ?? null,
              customer_name: body.customerName,
              customer_email: body.customerEmail ?? null,
              customer_phone: body.customerPhone ?? null,
              billing_address: body.billingAddress ?? null,
              customer_state: body.customerState ?? null,
              customer_gstin: body.customerGstin ?? null,
              recipient_email: body.recipientEmail ?? null,
              recipient_phone: body.recipientPhone ?? null,
              amount: totals.totalAmount,
              subtotal: totals.subtotal,
              gst_amount: totals.gstAmount,
              cgst_amount: totals.cgstAmount,
              sgst_amount: totals.sgstAmount,
              total_amount: totals.totalAmount,
              line_items: mapLineItemsToDb(body.lineItems),
              notes: body.notes ?? null,
              status: 'unpaid',
              portal_payment_id: body.paymentId ?? null,
              issue_date: new Date().toISOString().slice(0, 10),
              created_by: auth.user?.id ?? null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select('*')
            .single();
          if (error) throw error;
          const invoice = mapDbRowToInvoiceRecord(data as Record<string, unknown>);
          if (!body.saveAsDraft && body.deliveryChannel === 'whatsapp') {
            void client.functions
              .invoke('send-invoice-whatsapp', {
                body: {
                  invoice_id: invoice.id,
                },
              })
              .catch(() => undefined);
          }
          return { invoiceId: invoice.id, invoice };
        },
      }),
      invalidatesTags: ['Invoices'],
    }),

    updateInvoiceDraft: builder.mutation<
      InvoiceRecord,
      { invoiceId: string; patch: Partial<CreateInvoiceInput> }
    >({
      query: ({ invoiceId, patch }) => ({
        handler: async (client) => {
          const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (patch.customerName) updates.customer_name = patch.customerName;
          if (patch.customerEmail !== undefined) updates.customer_email = patch.customerEmail;
          if (patch.customerPhone !== undefined) updates.customer_phone = patch.customerPhone;
          if (patch.billingAddress !== undefined) updates.billing_address = patch.billingAddress;
          if (patch.customerState !== undefined) updates.customer_state = patch.customerState;
          if (patch.customerGstin !== undefined) updates.customer_gstin = patch.customerGstin;
          if (patch.recipientEmail !== undefined) updates.recipient_email = patch.recipientEmail;
          if (patch.recipientPhone !== undefined) updates.recipient_phone = patch.recipientPhone;
          if (patch.notes !== undefined) updates.notes = patch.notes;
          if (patch.lineItems) {
            const type = patch.invoiceType ?? 'gst';
            const totals = computeInvoiceTotals(patch.lineItems, type);
            updates.line_items = mapLineItemsToDb(patch.lineItems);
            updates.subtotal = totals.subtotal;
            updates.gst_amount = totals.gstAmount;
            updates.cgst_amount = totals.cgstAmount;
            updates.sgst_amount = totals.sgstAmount;
            updates.total_amount = totals.totalAmount;
            updates.amount = totals.totalAmount;
          }
          const { data, error } = await client
            .from('invoices')
            .update(updates)
            .eq('id', invoiceId)
            .select('*')
            .single();
          if (error) throw error;
          return mapDbRowToInvoiceRecord(data as Record<string, unknown>);
        },
      }),
      invalidatesTags: ['Invoices'],
    }),

    updateInvoicePdfPath: builder.mutation<void, { invoiceId: string; storagePath: string }>({
      query: ({ invoiceId, storagePath }) => ({
        handler: async (client) => {
          const { error } = await client
            .from('invoices')
            .update({ pdf_storage_path: storagePath, updated_at: new Date().toISOString() })
            .eq('id', invoiceId);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Invoices'],
    }),

    getInvoiceSignedUrl: builder.query<string, { storagePath: string; expirySeconds?: number }>({
      query: ({ storagePath, expirySeconds = 604800 }) => ({
        handler: async (client) => {
          const { data, error } = await client.storage
            .from(INVOICES_BUCKET)
            .createSignedUrl(storagePath, expirySeconds);
          if (error) throw error;
          return data.signedUrl;
        },
      }),
    }),

    downloadInvoice: builder.mutation<string, string>({
      query: (invoiceId) => ({
        handler: async (client) => {
          const { data: invoice, error } = await client
            .from('invoices')
            .select('pdf_storage_path, payment_id')
            .eq('id', invoiceId)
            .single();
          if (error) throw error;
          if (invoice.pdf_storage_path) {
            const { data: signed } = await client.storage
              .from(INVOICES_BUCKET)
              .createSignedUrl(invoice.pdf_storage_path, 604800);
            return signed?.signedUrl ?? '';
          }
          const { data, error: fnErr } = await client.functions.invoke('invoice-generator', {
            body: { invoiceId, paymentId: invoice.payment_id },
          });
          if (fnErr) throw fnErr;
          return String((data as { url?: string })?.url ?? '');
        },
      }),
    }),

    sendInvoice: builder.mutation<void, SendInvoiceInput>({
      query: (body) => ({
        handler: async (client) => {
          const { error } = await client.functions.invoke('send-invoice', { body });
          if (error) throw new Error(await parseSupabaseFunctionError(error, 'Failed to send invoice.'));
        },
      }),
      invalidatesTags: ['Invoices'],
    }),

    bulkSendInvoices: builder.mutation<BulkSendResult, BulkSendInvoicesInput>({
      query: (body) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('bulk-send-invoices', { body });
          if (error) throw error;
          return (data ?? { sent: 0, failed: 0, errors: [] }) as BulkSendResult;
        },
      }),
      invalidatesTags: ['Invoices'],
    }),

    createManualGstInvoice: builder.mutation<
      { invoiceId: string },
      { customerId: string; lineItems: ManualGstLineItem[]; notes?: string }
    >({
      query: (body) => ({
        handler: async (client) => {
          const lineItems = body.lineItems.map((l) => ({
            description: l.description,
            hsnSac: '998422',
            quantity: l.quantity,
            unit: 'Nos',
            unitPrice: l.rate,
            gstRate: l.gstPercent,
          }));
          const { data: user } = await client
            .from('users')
            .select('name, email, phone')
            .eq('id', body.customerId)
            .maybeSingle();
          const { data: auth } = await client.auth.getUser();
          const totals = computeInvoiceTotals(lineItems, 'gst');
          const { data: numRow } = await client.rpc('generate_invoice_number');
          const { data, error } = await client
            .from('invoices')
            .insert({
              user_id: body.customerId,
              invoice_number: String(numRow ?? `INV-${Date.now()}`),
              invoice_type: 'gst',
              delivery_status: 'pending',
              customer_name: user?.name ?? 'Customer',
              customer_email: user?.email ?? null,
              customer_phone: user?.phone ?? null,
              amount: totals.totalAmount,
              subtotal: totals.subtotal,
              gst_amount: totals.gstAmount,
              cgst_amount: totals.cgstAmount,
              sgst_amount: totals.sgstAmount,
              total_amount: totals.totalAmount,
              line_items: mapLineItemsToDb(lineItems),
              notes: body.notes ?? null,
              status: 'unpaid',
              issue_date: new Date().toISOString().slice(0, 10),
              created_by: auth.user?.id ?? null,
            })
            .select('id')
            .single();
          if (error) throw error;
          return { invoiceId: data.id as string };
        },
      }),
      invalidatesTags: ['Invoices'],
    }),

    getGstInvoiceRequests: builder.query<
      GstInvoiceRequestRecord[],
      { status?: GstInvoiceRequestStatus | 'all' } | void
    >({
      query: (filters) => ({
        handler: async (client) => {
          let query = client
            .from('gst_invoice_requests')
            .select(
              `
              *,
              customer:users!gst_invoice_requests_customer_id_fkey(id, name, customer_id, phone),
              payment:payments!gst_invoice_requests_payment_id_fkey(id, payment_number, total_amount, confirmed_at)
            `,
            )
            .order('created_at', { ascending: false })
            .limit(200);
          if (filters?.status && filters.status !== 'all') {
            query = query.eq('status', filters.status);
          }
          const { data, error } = await query;
          if (error) throw error;
          return (data ?? []).map((row) => mapGstInvoiceRequestRow(row as Record<string, unknown>));
        },
      }),
      providesTags: ['GstInvoiceRequests'],
    }),

    updateGstInvoiceRequest: builder.mutation<
      void,
      { id: string; status: GstInvoiceRequestStatus; adminNotes?: string }
    >({
      query: ({ id, status, adminNotes }) => ({
        handler: async (client) => {
          const { error } = await client
            .from('gst_invoice_requests')
            .update({
              status,
              admin_notes: adminNotes ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['GstInvoiceRequests'],
    }),

    getInvoiceForPayment: builder.query<InvoiceRecord | null, string>({
      query: (paymentId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('invoices')
            .select('*')
            .eq('portal_payment_id', paymentId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          if (!data) return null;
          return mapDbRowToInvoiceRecord(data as Record<string, unknown>);
        },
      }),
      providesTags: (_r, _e, paymentId) => [{ type: 'Invoices', id: `payment-${paymentId}` }],
    }),
  }),
});

export const {
  useGetAdminInvoicesQuery,
  useGetInvoiceStatsQuery,
  useGetInvoiceByIdQuery,
  useLazyGetInvoiceByIdQuery,
  useGetInvoiceCompanySettingsQuery,
  useGetInvoiceSettingsQuery,
  useUpdateInvoiceSettingsMutation,
  useCreateInvoiceMutation,
  useUpdateInvoiceDraftMutation,
  useUpdateInvoicePdfPathMutation,
  useLazyGetInvoiceSignedUrlQuery,
  useDownloadInvoiceMutation,
  useSendInvoiceMutation,
  useBulkSendInvoicesMutation,
  useCreateManualGstInvoiceMutation,
  useGetGstInvoiceRequestsQuery,
  useUpdateGstInvoiceRequestMutation,
  useGetInvoiceForPaymentQuery,
} = adminFinanceApi;

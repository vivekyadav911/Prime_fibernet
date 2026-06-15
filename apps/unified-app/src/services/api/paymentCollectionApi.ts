import type {
  CashCollectionPayload,
  ConfirmPaymentPayload,
  CreateOrderPayload,
  CustomerBill,
  PaymentAnalyticsRow,
  PaymentFilters,
  PaymentGatewayRecord,
  PaymentRecord,
} from '@/types/payments';

import { baseApi } from './baseApi';

function mapPayment(row: Record<string, unknown>): PaymentRecord {
  return {
    id: String(row.id),
    payment_number: String(row.payment_number),
    customer_id: String(row.customer_id),
    customer_name: String(row.customer_name),
    customer_phone: (row.customer_phone as string) ?? null,
    account_number: String(row.account_number),
    plan_name: (row.plan_name as string) ?? null,
    amount: Number(row.amount ?? 0),
    tax_amount: Number(row.tax_amount ?? 0),
    discount_amount: Number(row.discount_amount ?? 0),
    total_amount: Number(row.total_amount ?? 0),
    currency: String(row.currency ?? 'INR'),
    method: row.method as PaymentRecord['method'],
    channel: row.channel as PaymentRecord['channel'],
    gateway_id: (row.gateway_id as string) ?? null,
    gateway_slug: (row.gateway_slug as string) ?? null,
    gateway_order_id: (row.gateway_order_id as string) ?? null,
    gateway_payment_id: (row.gateway_payment_id as string) ?? null,
    gateway_signature: (row.gateway_signature as string) ?? null,
    gateway_raw_response: (row.gateway_raw_response as Record<string, unknown>) ?? null,
    gateway_fee: row.gateway_fee != null ? Number(row.gateway_fee) : null,
    collected_by: (row.collected_by as string) ?? null,
    cash_collection_notes: (row.cash_collection_notes as string) ?? null,
    cash_denominations: (row.cash_denominations as Record<string, number>) ?? null,
    receipt_number: (row.receipt_number as string) ?? null,
    collection_latitude: row.collection_latitude != null ? Number(row.collection_latitude) : null,
    collection_longitude: row.collection_longitude != null ? Number(row.collection_longitude) : null,
    evidence_photo_url: (row.evidence_photo_url as string) ?? null,
    status: row.status as PaymentRecord['status'],
    reviewed_by: (row.reviewed_by as string) ?? null,
    reviewed_at: (row.reviewed_at as string) ?? null,
    review_notes: (row.review_notes as string) ?? null,
    failure_reason: (row.failure_reason as string) ?? null,
    billing_period_start: (row.billing_period_start as string) ?? null,
    billing_period_end: (row.billing_period_end as string) ?? null,
    due_date: (row.due_date as string) ?? null,
    next_due_date: (row.next_due_date as string) ?? null,
    initiated_at: String(row.initiated_at ?? row.created_at),
    paid_at: (row.paid_at as string) ?? null,
    confirmed_at: (row.confirmed_at as string) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
    customer: row.customer as PaymentRecord['customer'],
    officer: row.officer as PaymentRecord['officer'],
    gateway: row.gateway as PaymentRecord['gateway'],
  };
}

function mapGateway(row: Record<string, unknown>): PaymentGatewayRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: row.slug as PaymentGatewayRecord['slug'],
    is_active: Boolean(row.is_active),
    is_default: Boolean(row.is_default),
    display_name: (row.display_name as string) ?? null,
    logo_url: (row.logo_url as string) ?? null,
    supported_methods: (row.supported_methods as PaymentGatewayRecord['supported_methods']) ?? [],
    credentials: (row.credentials as Record<string, string>) ?? {},
    test_mode: Boolean(row.test_mode),
    webhook_url: (row.webhook_url as string) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export type PaymentsListResult = {
  rows: PaymentRecord[];
  total: number;
  confirmedSum: number;
  pendingSum: number;
};

export const paymentCollectionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPayments: builder.query<PaymentsListResult, PaymentFilters | void>({
      query: (filters) => ({
        handler: async (client) => {
          const f = filters ?? {};
          const page = f.page ?? 1;
          const pageSize = f.pageSize ?? 20;
          const from = (page - 1) * pageSize;
          const to = from + pageSize - 1;

          let query = client
            .from('payments')
            .select(
              `*,
              customer:users!payments_customer_id_fkey(id, name, phone, customer_id),
              officer:officers!payments_collected_by_fkey(id, name, email),
              gateway:payment_gateways(id, name, slug, logo_url)`,
              { count: 'exact' },
            )
            .order(f.sortBy ?? 'created_at', { ascending: f.sortOrder === 'asc' })
            .range(from, to);

          if (f.status && f.status !== 'all') query = query.eq('status', f.status);
          if (f.method && f.method !== 'all') query = query.eq('method', f.method);
          if (f.channel && f.channel !== 'all') query = query.eq('channel', f.channel);
          if (f.gateway_slug && f.gateway_slug !== 'all') query = query.eq('gateway_slug', f.gateway_slug);
          if (f.officer_id && f.officer_id !== 'all') query = query.eq('collected_by', f.officer_id);
          if (f.dateFrom) query = query.gte('created_at', f.dateFrom);
          if (f.dateTo) query = query.lte('created_at', f.dateTo);
          if (f.search?.trim()) {
            const q = `%${f.search.trim()}%`;
            query = query.or(`payment_number.ilike.${q},customer_name.ilike.${q},account_number.ilike.${q}`);
          }

          const { data, error, count } = await query;
          if (error) throw error;

          const rows = (data ?? []).map((r) => mapPayment(r as Record<string, unknown>));

          const { data: sums } = await client.from('payments').select('status, total_amount');
          const all = sums ?? [];
          const confirmedSum = all
            .filter((p) => p.status === 'confirmed')
            .reduce((s, p) => s + Number(p.total_amount ?? 0), 0);
          const pendingSum = all
            .filter((p) => p.status === 'pending_review' || p.status === 'cash_collected')
            .reduce((s, p) => s + Number(p.total_amount ?? 0), 0);

          return { rows, total: count ?? rows.length, confirmedSum, pendingSum };
        },
      }),
      providesTags: ['Payments'],
    }),

    getPaymentDetail: builder.query<PaymentRecord, string>({
      query: (paymentId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('payments')
            .select(
              `*,
              customer:users!payments_customer_id_fkey(id, name, phone, customer_id),
              officer:officers!payments_collected_by_fkey(id, name, email),
              gateway:payment_gateways(id, name, slug, logo_url)`,
            )
            .eq('id', paymentId)
            .single();
          if (error) throw error;
          return mapPayment(data as Record<string, unknown>);
        },
      }),
      providesTags: (_r, _e, id) => [{ type: 'Payments', id }],
    }),

    confirmPaymentV2: builder.mutation<void, ConfirmPaymentPayload>({
      query: ({ paymentId, nextDueDate, reviewNotes, cashDenominations, receiptNumber }) => ({
        handler: async (client) => {
          const { data: { user } } = await client.auth.getUser();
          const { error } = await client
            .from('payments')
            .update({
              status: 'confirmed',
              reviewed_by: user?.id,
              reviewed_at: new Date().toISOString(),
              review_notes: reviewNotes ?? null,
              next_due_date: nextDueDate,
              cash_denominations: cashDenominations ?? null,
              receipt_number: receiptNumber ?? null,
            })
            .eq('id', paymentId);
          if (error) throw error;
          await client.functions.invoke('generate-payment-receipt', { body: { paymentId } });
        },
      }),
      invalidatesTags: ['Payments', 'Analytics'],
    }),

    rejectPaymentV2: builder.mutation<void, { paymentId: string; reason: string }>({
      query: ({ paymentId, reason }) => ({
        handler: async (client) => {
          const { data: { user } } = await client.auth.getUser();
          const { error } = await client
            .from('payments')
            .update({
              status: 'cancelled',
              reviewed_by: user?.id,
              reviewed_at: new Date().toISOString(),
              review_notes: reason,
              failure_reason: reason,
            })
            .eq('id', paymentId);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Payments'],
    }),

    getPaymentAnalyticsV2: builder.query<PaymentAnalyticsRow[], { dateFrom?: string; dateTo?: string } | void>({
      query: (filters) => ({
        handler: async (client) => {
          let query = client.from('payment_analytics').select('*').order('date', { ascending: false }).limit(90);
          if (filters?.dateFrom) query = query.gte('date', filters.dateFrom);
          if (filters?.dateTo) query = query.lte('date', filters.dateTo);
          const { data, error } = await query;
          if (error) throw error;
          return (data ?? []).map((row) => ({
            date: String(row.date),
            total_transactions: Number(row.total_transactions ?? 0),
            confirmed_count: Number(row.confirmed_count ?? 0),
            pending_review_count: Number(row.pending_review_count ?? 0),
            cash_pending_count: Number(row.cash_pending_count ?? 0),
            failed_count: Number(row.failed_count ?? 0),
            confirmed_revenue: Number(row.confirmed_revenue ?? 0),
            pending_revenue: Number(row.pending_revenue ?? 0),
            card_count: Number(row.card_count ?? 0),
            upi_count: Number(row.upi_count ?? 0),
            netbanking_count: Number(row.netbanking_count ?? 0),
            cash_count: Number(row.cash_count ?? 0),
            officer_collected_count: Number(row.officer_collected_count ?? 0),
            avg_payment_amount: Number(row.avg_payment_amount ?? 0),
          }));
        },
      }),
      providesTags: ['Analytics'],
    }),

    exportPaymentsV2: builder.mutation<{ url: string; filename: string }, { filters?: PaymentFilters; format?: 'xlsx' | 'pdf' }>({
      query: (body) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('export-payments', { body });
          if (error) throw error;
          return data as { url: string; filename: string };
        },
      }),
    }),

    getGateways: builder.query<PaymentGatewayRecord[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('payment_gateways')
            .select('*')
            .order('name');
          if (error) throw error;
          return (data ?? []).map((r) => mapGateway(r as Record<string, unknown>));
        },
      }),
      providesTags: ['Payments'],
    }),

    saveGatewayCredentials: builder.mutation<
      { success: boolean; webhookUrl?: string },
      {
        gatewayId: string;
        credentials?: Record<string, string>;
        testOnly?: boolean;
        activate?: boolean;
        setDefault?: boolean;
        testMode?: boolean;
      }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('save-gateway-credentials', { body });
          if (error) throw error;
          return data as { success: boolean; webhookUrl?: string };
        },
      }),
      invalidatesTags: ['Payments'],
    }),

    createPaymentOrderV2: builder.mutation<
      {
        paymentId: string;
        orderId: string;
        checkoutUrl: string | null;
        checkoutParams: Record<string, string> | null;
        gatewaySlug: string;
        keyId: string;
        amount: number;
      },
      CreateOrderPayload
    >({
      query: (body) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('create-payment-order', {
            body: {
              customerId: body.customerId,
              userName: body.userName,
              userEmail: body.userEmail,
              userPhone: body.userPhone,
              amount: body.amount,
              planName: body.planName,
              planId: body.planId,
              paymentMethod: body.paymentMethod,
              channel: body.channel ?? 'online_app',
              billingPeriodStart: body.billingPeriodStart,
              billingPeriodEnd: body.billingPeriodEnd,
              dueDate: body.dueDate,
            },
          });
          if (error) throw error;
          const res = data as Record<string, unknown>;
          return {
            paymentId: String(res.paymentId),
            orderId: String(res.orderId),
            checkoutUrl: (res.checkoutUrl as string) ?? null,
            checkoutParams: (res.checkoutParams as Record<string, string>) ?? null,
            gatewaySlug: String(res.gatewaySlug ?? res.gateway),
            keyId: String(res.keyId ?? ''),
            amount: Number(res.amount),
          };
        },
      }),
      invalidatesTags: ['Payments'],
    }),

    recordCashCollection: builder.mutation<PaymentRecord, CashCollectionPayload>({
      query: (body) => ({
        handler: async (client) => {
          const officerId = await client.rpc('current_officer_id');
          const { data, error } = await client
            .from('payments')
            .insert({
              customer_id: body.customerId,
              customer_name: body.customerName,
              account_number: body.accountNumber,
              plan_name: body.planName,
              amount: body.amount,
              total_amount: body.amount,
              method: 'cash',
              channel: 'officer_cash',
              collected_by: officerId.data as string,
              cash_collection_notes: body.notes,
              cash_denominations: body.denominations,
              status: 'cash_collected',
              paid_at: new Date().toISOString(),
              due_date: body.dueDate,
              billing_period_start: body.billingStart,
              billing_period_end: body.billingEnd,
              collection_latitude: body.latitude,
              collection_longitude: body.longitude,
            })
            .select()
            .single();
          if (error) throw error;

          if (body.photoUri) {
            const blob = await fetch(body.photoUri).then((r) => r.blob());
            const path = `${data.id}/evidence.jpg`;
            await client.storage.from('payment-evidence').upload(path, blob, { upsert: true });
            const { data: urlData } = client.storage.from('payment-evidence').getPublicUrl(path);
            await client.from('payments').update({ evidence_photo_url: urlData.publicUrl }).eq('id', data.id);
          }

          await client.from('customer_interactions').insert({
            customer_id: body.customerId,
            interaction_type: 'cash_collection',
            direction: 'inbound',
            subject: `Cash collected ₹${body.amount}`,
            notes: body.notes,
            agent_id: officerId.data,
          });

          return mapPayment(data as Record<string, unknown>);
        },
      }),
      invalidatesTags: ['Payments'],
    }),

    getCustomerBill: builder.query<CustomerBill, string>({
      query: (customerId) => ({
        handler: async (client) => {
          const { data: user, error } = await client
            .from('users')
            .select('id, name, customer_id, payment_status, outstanding_amount, next_due_date, expiry_date')
            .eq('id', customerId)
            .single();
          if (error) throw error;

          const { data: sub } = await client
            .from('subscriptions')
            .select('plan_id, start_at, end_at')
            .eq('user_id', customerId)
            .eq('status', 'active')
            .maybeSingle();

          let planName: string | null = null;
          let planAmount = Number(user.outstanding_amount ?? 0);
          if (sub?.plan_id) {
            const { data: plan } = await client.from('plans').select('name, price').eq('id', sub.plan_id).maybeSingle();
            planName = plan?.name ?? null;
            planAmount = Number(plan?.price ?? planAmount);
          }
          const taxAmount = 0;

          return {
            customerId: user.id,
            customerName: user.name,
            accountNumber: user.customer_id ?? `ACC-${String(user.id).slice(0, 8)}`,
            planName: planName ?? null,
            planAmount,
            taxAmount,
            lateFee: 0,
            totalPayable: planAmount + taxAmount,
            billingPeriodStart: sub?.start_at ?? null,
            billingPeriodEnd: sub?.end_at ?? null,
            dueDate: user.next_due_date ?? user.expiry_date ?? null,
            paymentStatus: user.payment_status ?? 'pending',
            outstandingAmount: Number(user.outstanding_amount ?? 0),
          };
        },
      }),
      providesTags: ['Payments'],
    }),

    getCustomerPaymentHistoryV2: builder.query<PaymentRecord[], string>({
      query: (customerId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('payments')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) throw error;
          return (data ?? []).map((r) => mapPayment(r as Record<string, unknown>));
        },
      }),
      providesTags: ['Payments'],
    }),

    getOfficerCollections: builder.query<
      { pending: PaymentRecord[]; todayTotal: number; confirmedToday: number },
      string
    >({
      query: (officerId) => ({
        handler: async (client) => {
          const today = new Date().toISOString().slice(0, 10);
          const { data: assigned } = await client
            .from('users')
            .select('id, name, customer_id, outstanding_amount, next_due_date, payment_status')
            .eq('assigned_officer_id', officerId)
            .in('payment_status', ['pending', 'overdue']);

          const { data: collections } = await client
            .from('payments')
            .select('*')
            .eq('collected_by', officerId)
            .gte('created_at', `${today}T00:00:00`)
            .order('created_at', { ascending: false });

          const rows = collections ?? [];
          const todayTotal = rows.reduce((s, p) => s + Number(p.total_amount ?? 0), 0);
          const confirmedToday = rows.filter((p) => p.status === 'confirmed').length;

          const pending = (assigned ?? []).map((u) => ({
            id: u.id,
            payment_number: '',
            customer_id: u.id,
            customer_name: u.name,
            customer_phone: null,
            account_number: u.customer_id ?? '',
            plan_name: null,
            amount: Number(u.outstanding_amount ?? 0),
            tax_amount: 0,
            discount_amount: 0,
            total_amount: Number(u.outstanding_amount ?? 0),
            currency: 'INR',
            method: 'cash' as const,
            channel: 'officer_cash' as const,
            gateway_id: null,
            gateway_slug: null,
            gateway_order_id: null,
            gateway_payment_id: null,
            gateway_signature: null,
            gateway_raw_response: null,
            gateway_fee: null,
            collected_by: officerId,
            cash_collection_notes: null,
            cash_denominations: null,
            receipt_number: null,
            collection_latitude: null,
            collection_longitude: null,
            evidence_photo_url: null,
            status: 'initiated' as const,
            reviewed_by: null,
            reviewed_at: null,
            review_notes: null,
            failure_reason: null,
            billing_period_start: null,
            billing_period_end: null,
            due_date: u.next_due_date,
            next_due_date: null,
            initiated_at: new Date().toISOString(),
            paid_at: null,
            confirmed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          return { pending, todayTotal, confirmedToday };
        },
      }),
      providesTags: ['Payments'],
    }),

    getPaymentReceipt: builder.query<{ url: string | null; receiptNumber: string }, string>({
      query: (paymentId) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('generate-payment-receipt', {
            body: { paymentId },
          });
          if (error) throw error;
          const res = data as { url?: string; receiptNumber?: string };
          return { url: res.url ?? null, receiptNumber: res.receiptNumber ?? '' };
        },
      }),
    }),

    initiateRefundV2: builder.mutation<void, { paymentId: string; amount: number; reason: string }>({
      query: (body) => ({
        handler: async (client) => {
          const { data: { user } } = await client.auth.getUser();
          const { error } = await client.from('payment_refunds').insert({
            payment_id: body.paymentId,
            amount: body.amount,
            reason: body.reason,
            initiated_by: user?.id,
          });
          if (error) throw error;
          await client.from('payments').update({ status: 'refunded' }).eq('id', body.paymentId);
        },
      }),
      invalidatesTags: ['Payments'],
    }),
  }),
});

export const {
  useGetPaymentsQuery,
  useGetPaymentDetailQuery,
  useConfirmPaymentV2Mutation,
  useRejectPaymentV2Mutation,
  useGetPaymentAnalyticsV2Query,
  useExportPaymentsV2Mutation,
  useGetGatewaysQuery,
  useSaveGatewayCredentialsMutation,
  useCreatePaymentOrderV2Mutation,
  useRecordCashCollectionMutation,
  useGetCustomerBillQuery,
  useGetCustomerPaymentHistoryV2Query,
  useGetOfficerCollectionsQuery,
  useGetPaymentReceiptQuery,
  useLazyGetPaymentReceiptQuery,
  useInitiateRefundV2Mutation,
} = paymentCollectionApi;

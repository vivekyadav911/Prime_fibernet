import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  CashCollectionPayload,
  CollectionAssignmentEvent,
  CollectionDashboardKpis,
  CollectionStatus,
  ConfirmPaymentPayload,
  CreateOrderPayload,
  CustomerBill,
  OfficerAssignedCustomer,
  PaymentAnalyticsRow,
  PaymentFilters,
  PaymentGatewayRecord,
  PaymentRecord,
} from '@/types/payments';

import { baseApi } from './baseApi';

function mapOfficerJoin(raw: unknown): PaymentRecord['officer'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  return {
    id: String(o.id),
    name: String(o.full_name ?? o.name ?? 'Officer'),
    email: (o.email as string) ?? null,
  };
}

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
    officer: mapOfficerJoin(row.officer),
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
  reviewCount: number;
};

async function resolveCustomerUserId(client: SupabaseClient, authUserId?: string): Promise<string> {
  const { data: rpcId, error: rpcError } = await client.rpc('current_customer_user_id');
  if (!rpcError && rpcId) return String(rpcId);

  if (authUserId) {
    const byId = await client.from('users').select('id').eq('id', authUserId).maybeSingle();
    if (byId.data?.id) return String(byId.data.id);
    const byAuth = await client.from('users').select('id').eq('auth_user_id', authUserId).maybeSingle();
    if (byAuth.data?.id) return String(byAuth.data.id);
  }

  throw rpcError ?? new Error('Customer profile not found');
}

function mapAssignedCustomerRow(row: Record<string, unknown>): OfficerAssignedCustomer {
  const assignmentRaw = row.assignment_type != null ? String(row.assignment_type) : 'assigned';
  const assignmentType: OfficerAssignedCustomer['assignmentType'] =
    assignmentRaw === 'open_pool'
      ? 'open_pool'
      : assignmentRaw === 'claimed'
        ? 'claimed'
        : 'assigned';
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    customer_id: String(row.customer_id ?? ''),
    phone: row.phone != null ? String(row.phone) : null,
    outstanding_amount: Number(row.outstanding_amount ?? 0),
    next_due_date: row.next_due_date != null ? String(row.next_due_date) : null,
    payment_status: row.payment_status != null ? String(row.payment_status) : null,
    assignmentType,
    collectionStatus:
      row.collection_status != null ? (String(row.collection_status) as CollectionStatus) : null,
  };
}

async function fetchOfficerCollectibleCustomers(
  client: SupabaseClient,
  searchQuery = '',
): Promise<OfficerAssignedCustomer[]> {
  const { data, error } = await client.rpc('get_officer_collectible_customers', {
    p_query: searchQuery.trim(),
  });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => mapAssignedCustomerRow(row));
}

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
              officer:officers!payments_collected_by_fkey(id, full_name, email),
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

          const reviewCount = all.filter(
            (p) => p.status === 'pending_review' || p.status === 'cash_collected',
          ).length;

          return { rows, total: count ?? rows.length, confirmedSum, pendingSum, reviewCount };
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
              officer:officers!payments_collected_by_fkey(id, full_name, email),
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
          const method = body.method ?? 'cash';
          const { data, error } = await client
            .from('payments')
            .insert({
              customer_id: body.customerId,
              customer_name: body.customerName,
              account_number: body.accountNumber,
              plan_name: body.planName,
              amount: body.amount,
              total_amount: body.amount,
              method,
              channel: 'officer_cash',
              collected_by: officerId.data as string,
              cash_collection_notes: body.notes,
              cash_denominations: body.denominations,
              receipt_number:
                method === 'card' && body.paymentReference
                  ? `CARD-${body.paymentReference}`
                  : null,
              gateway_payment_id: method === 'upi' ? body.paymentReference : null,
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
          if (error) {
            if (error.code === '42501' || error.message.includes('policy')) {
              throw new Error(
                'You cannot collect from this customer. They may be assigned to another officer.',
              );
            }
            throw error;
          }

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

    getCustomerBill: builder.query<CustomerBill, string | void>({
      query: (authUserId) => ({
        handler: async (client) => {
          const customerId = await resolveCustomerUserId(client, authUserId ?? undefined);

          const { data: user, error } = await client
            .from('users')
            .select(
              'id, name, customer_id, payment_status, outstanding_amount, next_due_date, expiry_date, last_paid_amount, last_paid_at',
            )
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
            const { data: plan } = await client
              .from('plans')
              .select('name, price')
              .eq('id', sub.plan_id)
              .maybeSingle();
            planName = plan?.name ?? null;
            planAmount = Number(plan?.price ?? planAmount);
          }
          if (planAmount <= 0 && user.outstanding_amount) {
            planAmount = Number(user.outstanding_amount);
          }

          const taxAmount = Math.round(planAmount * 0.18 * 100) / 100;

          return {
            customerId: user.id,
            customerName: user.name,
            accountNumber: user.customer_id ?? `ACC-${String(user.id).slice(0, 8)}`,
            planName: planName ?? null,
            planAmount,
            taxAmount,
            lateFee: user.payment_status === 'overdue' ? Math.round(planAmount * 0.05 * 100) / 100 : 0,
            totalPayable: planAmount + taxAmount + (user.payment_status === 'overdue' ? Math.round(planAmount * 0.05 * 100) / 100 : 0),
            billingPeriodStart: sub?.start_at ?? null,
            billingPeriodEnd: sub?.end_at ?? null,
            dueDate: user.next_due_date ?? user.expiry_date ?? null,
            paymentStatus: user.payment_status ?? 'pending',
            outstandingAmount: Number(user.outstanding_amount ?? 0),
            lastPaidAmount: user.last_paid_amount != null ? Number(user.last_paid_amount) : null,
            lastPaidAt: user.last_paid_at ?? null,
          };
        },
      }),
      providesTags: ['Payments'],
    }),

    getCustomerPaymentHistoryV2: builder.query<PaymentRecord[], string | void>({
      query: (authUserId) => ({
        handler: async (client) => {
          await resolveCustomerUserId(client, authUserId ?? undefined);
          const { data, error } = await client
            .from('payments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) throw error;
          return (data ?? []).map((r) => mapPayment(r as Record<string, unknown>));
        },
      }),
      providesTags: ['Payments'],
    }),

    getActivePaymentGateway: builder.query<
      { slug: string; display_name: string; logo_url: string | null; supported_methods: string[]; test_mode: boolean } | null,
      void
    >({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('get_active_payment_gateway');
          if (error) throw error;
          const row = Array.isArray(data) ? data[0] : data;
          if (!row) return null;
          return {
            slug: String(row.slug),
            display_name: String(row.display_name ?? row.slug),
            logo_url: (row.logo_url as string) ?? null,
            supported_methods: (row.supported_methods as string[]) ?? [],
            test_mode: Boolean(row.test_mode),
          };
        },
      }),
    }),

    getOfficerCollections: builder.query<
      {
        myWork: OfficerAssignedCustomer[];
        openPool: OfficerAssignedCustomer[];
        assigned: OfficerAssignedCustomer[];
        pending: OfficerAssignedCustomer[];
        todayTotal: number;
        confirmedToday: number;
      },
      void
    >({
      query: () => ({
        handler: async (client) => {
          const today = new Date().toISOString().slice(0, 10);
          const all = await fetchOfficerCollectibleCustomers(client);
          const myWork = all.filter(
            (c) => c.assignmentType === 'assigned' || c.assignmentType === 'claimed',
          );
          const openPool = all.filter((c) => c.assignmentType === 'open_pool');

          const { data: officerId } = await client.rpc('current_officer_id');
          const { data: collections } = await client
            .from('payments')
            .select('*')
            .eq('collected_by', officerId as string)
            .gte('created_at', `${today}T00:00:00`)
            .order('created_at', { ascending: false });

          const rows = collections ?? [];
          const todayTotal = rows.reduce((s, p) => s + Number(p.total_amount ?? 0), 0);
          const confirmedToday = rows.filter((p) => p.status === 'confirmed').length;
          const pending = myWork.filter((c) => c.outstanding_amount > 0);

          return { myWork, openPool, assigned: myWork, pending, todayTotal, confirmedToday };
        },
      }),
      providesTags: ['Payments'],
    }),

    claimCollectionCustomer: builder.mutation<{ customerId: string; claimed: boolean }, string>({
      query: (customerId) => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('claim_collection_customer', {
            p_customer_id: customerId,
          });
          if (error) throw error;
          const result = data as { customer_id?: string; claimed?: boolean; already_claimed?: boolean };
          return {
            customerId: String(result.customer_id ?? customerId),
            claimed: Boolean(result.claimed ?? result.already_claimed),
          };
        },
      }),
      invalidatesTags: ['Payments', 'CollectionAssignments'],
    }),

    getCollectionDashboardKpis: builder.query<CollectionDashboardKpis, void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('get_collection_dashboard_kpis');
          if (error) throw error;
          const row = data as Record<string, unknown>;
          return {
            total_outstanding: Number(row.total_outstanding ?? 0),
            collected_today: Number(row.collected_today ?? 0),
            pending_review: Number(row.pending_review ?? 0),
            failed_today: Number(row.failed_today ?? 0),
            open_pool_count: Number(row.open_pool_count ?? 0),
            active_officers: Number(row.active_officers ?? 0),
          };
        },
      }),
      providesTags: ['Analytics', 'Payments'],
    }),

    getCustomerCollectionHistory: builder.query<CollectionAssignmentEvent[], string>({
      query: (customerId) => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('get_customer_collection_history', {
            p_customer_id: customerId,
          });
          if (error) throw error;
          return (data ?? []).map((row: Record<string, unknown>) => ({
            id: String(row.id),
            customer_id: String(row.customer_id),
            assigned_officer_id: (row.assigned_officer_id as string) ?? null,
            claimed_by_officer_id: (row.claimed_by_officer_id as string) ?? null,
            status: String(row.status),
            actor_id: (row.actor_id as string) ?? null,
            actor_role: (row.actor_role as string) ?? null,
            notes: (row.notes as string) ?? null,
            created_at: String(row.created_at),
          }));
        },
      }),
      providesTags: ['CollectionAssignments'],
    }),

    getRecentOfficerCollections: builder.query<PaymentRecord[], number | void>({
      query: (limit = 10) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('payments')
            .select('*')
            .in('channel', ['officer_cash', 'office_cash'])
            .order('created_at', { ascending: false })
            .limit(limit ?? 10);
          if (error) throw error;
          return (data ?? []).map((row) => mapPayment(row as Record<string, unknown>));
        },
      }),
      providesTags: ['Payments'],
    }),

    getOfficerAssignedCustomers: builder.query<OfficerAssignedCustomer[], string>({
      query: (searchQuery) => ({
        handler: async (client) => fetchOfficerCollectibleCustomers(client, searchQuery),
      }),
      providesTags: ['Payments'],
    }),

    getOfficerCustomerPaymentHistory: builder.query<PaymentRecord[], string>({
      query: (customerId) => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('get_officer_customer_payment_history', {
            p_customer_id: customerId,
          });
          if (error) throw error;
          return (data ?? []).map((row: Record<string, unknown>) => mapPayment(row));
        },
      }),
      providesTags: ['Payments'],
    }),

    searchOfficerCustomers: builder.query<OfficerAssignedCustomer[], string>({
      query: (searchQuery) => ({
        handler: async (client) => fetchOfficerCollectibleCustomers(client, searchQuery),
      }),
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
  useGetActivePaymentGatewayQuery,
  useGetOfficerCollectionsQuery,
  useGetOfficerAssignedCustomersQuery,
  useLazyGetOfficerAssignedCustomersQuery,
  useGetOfficerCustomerPaymentHistoryQuery,
  useSearchOfficerCustomersQuery,
  useLazySearchOfficerCustomersQuery,
  useClaimCollectionCustomerMutation,
  useGetCollectionDashboardKpisQuery,
  useGetCustomerCollectionHistoryQuery,
  useGetRecentOfficerCollectionsQuery,
  useGetPaymentReceiptQuery,
  useLazyGetPaymentReceiptQuery,
  useInitiateRefundV2Mutation,
} = paymentCollectionApi;

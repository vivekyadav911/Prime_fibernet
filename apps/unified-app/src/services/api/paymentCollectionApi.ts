import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  BankAccountInput,
  BankAccountRecord,
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
  PaymentActivityEvent,
  ManualPaymentPayload,
  PaymentStatus,
} from '@/types/payments';

import { formatCustomerAccountId } from '@/utils/customerAccount';
import { parseSupabaseFunctionError } from '@/utils/supabaseFunctionError';
import { formatSupabaseRpcError } from '@/utils/supabaseRpcError';
import { paymentText } from '@/utils/paymentText';
import { attachPaymentCollectionMeta } from '@/utils/uploadPaymentEvidence';

import { fetchActiveSubscriptionRow } from '@/services/customer/fetchActiveSubscriptionRow';
import {
  buildSubscriptionBillAmount,
  dedupePaymentHistoryForDisplay,
  resolveCurrentOutstanding,
  resolvePaymentChargeAmount,
} from '@/services/customer/customerOutstanding';
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
    gateway_slug: paymentText(row.gateway_slug),
    gateway_order_id: paymentText(row.gateway_order_id),
    gateway_payment_id: paymentText(row.gateway_payment_id),
    gateway_signature: paymentText(row.gateway_signature),
    gateway_raw_response: (row.gateway_raw_response as Record<string, unknown>) ?? null,
    gateway_fee: row.gateway_fee != null ? Number(row.gateway_fee) : null,
    collected_by: (row.collected_by as string) ?? null,
    cash_collection_notes: paymentText(row.cash_collection_notes),
    cash_denominations: (row.cash_denominations as Record<string, number>) ?? null,
    receipt_number: paymentText(row.receipt_number),
    collection_latitude: row.collection_latitude != null ? Number(row.collection_latitude) : null,
    collection_longitude: row.collection_longitude != null ? Number(row.collection_longitude) : null,
    evidence_photo_url: paymentText(row.evidence_photo_url),
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

function mapBankAccount(row: Record<string, unknown>): BankAccountRecord {
  return {
    id: String(row.id),
    nickname: String(row.nickname),
    upi_vpa: String(row.upi_vpa),
    bank_name: (row.bank_name as string) ?? null,
    is_active: Boolean(row.is_active),
    is_default: Boolean(row.is_default),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
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
    collectionUpdatedAt:
      row.collection_updated_at != null ? String(row.collection_updated_at) : null,
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
          const lite = Boolean(f.lite);

          let query = lite
            ? client.from('payments').select('*')
            : client
                .from('payments')
                .select(
                  `*,
              customer:users!payments_customer_id_fkey(id, name, phone, customer_id),
              officer:officers!payments_collected_by_fkey(id, full_name, email)`,
                  { count: 'exact' },
                );

          query = query
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

          let confirmedSum = 0;
          let pendingSum = 0;
          let reviewCount = 0;
          if (!f.skipAggregates) {
            const [confirmedRes, pendingRes, reviewRes] = await Promise.all([
              client.from('payments').select('total_amount').eq('status', 'confirmed'),
              client
                .from('payments')
                .select('total_amount')
                .in('status', ['pending_review', 'cash_collected']),
              client
                .from('payments')
                .select('id', { count: 'exact', head: true })
                .in('status', ['pending_review', 'cash_collected']),
            ]);
            if (!confirmedRes.error && confirmedRes.data) {
              confirmedSum = confirmedRes.data.reduce(
                (s, p) => s + Number(p.total_amount ?? 0),
                0,
              );
            }
            if (!pendingRes.error && pendingRes.data) {
              pendingSum = pendingRes.data.reduce((s, p) => s + Number(p.total_amount ?? 0), 0);
            }
            if (!reviewRes.error) {
              reviewCount = reviewRes.count ?? 0;
            }
          }

          return {
            rows,
            total: lite ? rows.length : (count ?? rows.length),
            confirmedSum,
            pendingSum,
            reviewCount,
          };
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

    getCustomerPaymentDetail: builder.query<PaymentRecord, string>({
      query: (paymentId) => ({
        handler: async (client) => {
          const customerId = await resolveCustomerUserId(client);
          const { data, error } = await client
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .eq('customer_id', customerId)
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
              confirmed_at: new Date().toISOString(),
            })
            .eq('id', paymentId);
          if (error) throw error;

          const { data: paymentRow } = await client
            .from('payments')
            .select('channel')
            .eq('id', paymentId)
            .maybeSingle();
          if (
            paymentRow?.channel === 'officer_cash' ||
            paymentRow?.channel === 'office_cash'
          ) {
            await client.rpc('finalize_officer_collection', { p_payment_id: paymentId });
          }
        },
      }),
      invalidatesTags: ['Payments', 'Analytics', 'CollectionAssignments'],
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
              intent: body.intent ?? 'bill',
              billingPeriodStart: body.billingPeriodStart,
              billingPeriodEnd: body.billingPeriodEnd,
              dueDate: body.dueDate,
            },
          });
          if (error) {
            const msg = await parseSupabaseFunctionError(error, 'Could not start checkout.');
            throw new Error(msg);
          }
          const res = data as Record<string, unknown>;
          if (res.error) throw new Error(String(res.error));
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
          const { data: officerId, error: officerErr } = await client.rpc('current_officer_id');
          if (officerErr || !officerId) {
            throw new Error(formatSupabaseRpcError(officerErr, 'Officer session required'));
          }
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
              collection_source: 'field_collection',
              collected_by: officerId as string,
              cash_collection_notes: body.notes,
              cash_denominations: body.denominations,
              receipt_number:
                method === 'netbanking' && body.paymentReference
                  ? `NB-${body.paymentReference}`
                  : null,
              gateway_payment_id: method === 'upi' ? body.paymentReference : null,
              status: 'pending_review',
              verification_method: 'manual',
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

          await attachPaymentCollectionMeta(client, String(data.id), {
            latitude: body.latitude,
            longitude: body.longitude,
            photoUri: body.photoUri,
          });

          await client.from('customer_interactions').insert({
            customer_id: body.customerId,
            interaction_type: 'cash_collection',
            direction: 'inbound',
            subject: `Cash collected ₹${body.amount}`,
            notes: body.notes,
            agent_id: officerId,
          });

          await client.from('audit_logs').insert({
            actor_role: 'officer',
            action: 'cash_collected',
            target_entity: 'payments',
            new_values: {
              payment_id: data.id,
              amount: body.amount,
              method,
              customer_id: body.customerId,
              customer_name: body.customerName,
              collected_by: officerId,
              has_evidence: Boolean(body.photoUri),
              has_geo: body.latitude != null && body.longitude != null,
            },
            status: 'SUCCESS',
          });

          const { data: refreshed, error: refreshError } = await client
            .from('payments')
            .select('*')
            .eq('id', data.id)
            .single();
          if (refreshError || !refreshed) {
            return mapPayment(data as Record<string, unknown>);
          }
          return mapPayment(refreshed as Record<string, unknown>);
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

          const subRow = await fetchActiveSubscriptionRow(client, customerId);
          const sub = subRow
            ? {
                plan_id: subRow.plan_id as string,
                start_at: subRow.start_at as string,
                end_at: subRow.end_at as string,
                status: subRow.status as string,
              }
            : null;

          let planName: string | null = null;
          let subscriptionPlanPrice = 0;
          if (sub?.plan_id) {
            const { data: plan } = await client
              .from('plans')
              .select('name, price')
              .eq('id', sub.plan_id)
              .maybeSingle();
            planName = plan?.name ?? null;
            subscriptionPlanPrice = Number(plan?.price ?? 0);
          }

          const { data: openPayments } = await client
            .from('payments')
            .select('id, total_amount, status, billing_period_start, created_at')
            .eq('customer_id', customerId)
            .in('status', ['initiated', 'pending_review', 'failed', 'cancelled']);

          const { data: confirmedPayments } = await client
            .from('payments')
            .select('id, total_amount, status, billing_period_start, created_at')
            .eq('customer_id', customerId)
            .eq('status', 'confirmed');

          const userOutstanding = Number(user.outstanding_amount ?? 0);
          const resolved = resolveCurrentOutstanding(
            (openPayments ?? []).map((row) => ({
              id: String(row.id),
              total_amount: Number(row.total_amount ?? 0),
              status: String(row.status) as PaymentStatus,
              billing_period_start: (row.billing_period_start as string | null) ?? null,
              created_at: String(row.created_at),
            })),
            userOutstanding,
            subscriptionPlanPrice,
            (confirmedPayments ?? []).map((row) => ({
              id: String(row.id),
              total_amount: Number(row.total_amount ?? 0),
              status: String(row.status) as PaymentStatus,
              billing_period_start: (row.billing_period_start as string | null) ?? null,
              created_at: String(row.created_at),
            })),
            sub?.start_at ?? null,
          );

          const isOverdue = user.payment_status === 'overdue';
          const hasDue = resolved.amount > 0;
          const billParts = buildSubscriptionBillAmount(subscriptionPlanPrice, {
            isOverdue: isOverdue && hasDue,
          });

          let planAmount: number;
          let taxAmount: number;
          let lateFee: number;
          let totalPayable: number;
          let outstandingAmount: number;

          if (subscriptionPlanPrice > 0 && hasDue) {
            planAmount = billParts.planAmount;
            taxAmount = billParts.taxAmount;
            lateFee = billParts.lateFee;
            totalPayable = billParts.totalPayable;
            outstandingAmount = billParts.outstandingAmount;
          } else if (subscriptionPlanPrice > 0) {
            planAmount = subscriptionPlanPrice;
            taxAmount = 0;
            lateFee = 0;
            totalPayable = 0;
            outstandingAmount = 0;
          } else {
            planAmount = resolved.amount;
            taxAmount = 0;
            lateFee = 0;
            totalPayable = resolved.amount;
            outstandingAmount = resolved.amount;
          }

          return {
            customerId: user.id,
            customerName: user.name,
            accountNumber: formatCustomerAccountId(user.customer_id, user.id),
            planName: planName ?? null,
            planAmount,
            taxAmount,
            lateFee,
            totalPayable,
            billingPeriodStart: sub?.start_at ?? null,
            billingPeriodEnd: sub?.end_at ?? null,
            dueDate: user.next_due_date ?? user.expiry_date ?? null,
            paymentStatus: user.payment_status ?? 'pending',
            outstandingAmount,
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
          const customerId = await resolveCustomerUserId(client, authUserId ?? undefined);
          const { data, error } = await client
            .from('payments')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) throw error;
          const mapped = (data ?? []).map((r) => mapPayment(r as Record<string, unknown>));
          return dedupePaymentHistoryForDisplay(mapped);
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
          const pending = myWork;

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
            event_source: (row.event_source as string) ?? null,
            payment_id: (row.payment_id as string) ?? null,
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

    getPaymentReceipt: builder.query<{ url: string | null; receiptNumber: string; html?: string | null }, string>({
      query: (paymentId) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('generate-payment-receipt', {
            body: { paymentId },
          });
          if (error) {
            const msg = await parseSupabaseFunctionError(error, 'Could not generate receipt.');
            throw new Error(msg);
          }
          const res = data as { url?: string; receiptNumber?: string; html?: string; error?: string };
          if (res.error) throw new Error(res.error);
          return {
            url: res.url ?? null,
            receiptNumber: res.receiptNumber ?? '',
            html: res.html ?? null,
          };
        },
      }),
    }),

    initiateRefundV2: builder.mutation<void, { paymentId: string; amount: number; reason: string }>({
      query: (body) => ({
        handler: async (client) => {
          const { error } = await client.rpc('initiate_payment_refund', {
            p_payment_id: body.paymentId,
            p_amount: body.amount,
            p_reason: body.reason,
          });
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Payments', 'CollectionAssignments'],
    }),

    recordManualPayment: builder.mutation<{ paymentId: string; status: string }, ManualPaymentPayload>({
      query: (body) => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('record_manual_payment', {
            p_customer_id: body.customerId,
            p_amount: body.amount,
            p_method: body.method,
            p_reference: body.reference ?? null,
            p_notes: body.notes ?? null,
            p_confirmed: body.confirmed ?? false,
            p_ticket_id: body.ticketId ?? null,
            p_bank_account_id: body.bankAccountId ?? null,
            p_verification_method: body.verificationMethod ?? 'manual',
          });
          if (error) {
            throw new Error(formatSupabaseRpcError(error, 'Could not record payment. Try again.'));
          }
          const result = data as { payment_id?: string; status?: string };
          const paymentId = String(result.payment_id);

          await attachPaymentCollectionMeta(client, paymentId, {
            latitude: body.latitude,
            longitude: body.longitude,
            photoUri: body.photoUri,
          });

          return {
            paymentId,
            status: String(result.status ?? 'pending_review'),
          };
        },
      }),
      invalidatesTags: ['Payments', 'CollectionAssignments', 'Analytics'],
    }),

    getBankAccounts: builder.query<BankAccountRecord[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('bank_accounts')
            .select('*')
            .eq('is_active', true)
            .order('is_default', { ascending: false })
            .order('nickname', { ascending: true });
          if (error) throw error;
          return (data ?? []).map((row) => mapBankAccount(row as Record<string, unknown>));
        },
      }),
      providesTags: [{ type: 'Payments', id: 'bank-accounts' }],
    }),

    getBankAccountsAdmin: builder.query<BankAccountRecord[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('bank_accounts')
            .select('*')
            .order('is_default', { ascending: false })
            .order('nickname', { ascending: true });
          if (error) throw error;
          return (data ?? []).map((row) => mapBankAccount(row as Record<string, unknown>));
        },
      }),
      providesTags: [{ type: 'Payments', id: 'bank-accounts-admin' }],
    }),

    upsertBankAccount: builder.mutation<BankAccountRecord, BankAccountInput & { id?: string }>({
      query: (body) => ({
        handler: async (client) => {
          const payload = {
            nickname: body.nickname.trim(),
            upi_vpa: body.upi_vpa.trim(),
            bank_name: body.bank_name?.trim() ?? null,
            is_active: body.is_active ?? true,
            is_default: body.is_default ?? false,
          };
          if (body.id) {
            const { data, error } = await client
              .from('bank_accounts')
              .update(payload)
              .eq('id', body.id)
              .select('*')
              .single();
            if (error) throw error;
            return mapBankAccount(data as Record<string, unknown>);
          }
          const { data, error } = await client
            .from('bank_accounts')
            .insert(payload)
            .select('*')
            .single();
          if (error) throw error;
          return mapBankAccount(data as Record<string, unknown>);
        },
      }),
      invalidatesTags: [
        { type: 'Payments', id: 'bank-accounts' },
        { type: 'Payments', id: 'bank-accounts-admin' },
      ],
    }),

    getPaymentActivityTimeline: builder.query<PaymentActivityEvent[], string>({
      query: (paymentId) => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('get_payment_activity_timeline', {
            p_payment_id: paymentId,
          });
          if (error) throw error;
          return (data ?? []).map((row: Record<string, unknown>) => ({
            id: String(row.id),
            event_type: String(row.event_type),
            status: (row.status as string) ?? null,
            title: String(row.title),
            notes: (row.notes as string) ?? null,
            actor_role: (row.actor_role as string) ?? null,
            created_at: String(row.created_at),
          }));
        },
      }),
      providesTags: (_r, _e, id) => [{ type: 'Payments', id: `timeline-${id}` }],
    }),

    pollPendingPayments: builder.mutation<
      { polled: number; resolved: number },
      Array<{ paymentId: string; gatewayOrderId: string; gatewaySlug?: string }>
    >({
      query: (items) => ({
        handler: async (client) => {
          const maxAgeMs = 24 * 60 * 60 * 1000;
          let resolved = 0;

          for (const item of items) {
            const { data: row } = await client
              .from('payments')
              .select('created_at, status')
              .eq('id', item.paymentId)
              .maybeSingle();

            if (!row) continue;
            if (row.status === 'confirmed') {
              resolved += 1;
              continue;
            }

            const age = Date.now() - new Date(String(row.created_at)).getTime();
            if (age > maxAgeMs) continue;

            const gateway =
              item.gatewaySlug === 'easebuzz'
                ? 'easybuzz'
                : item.gatewaySlug === 'razorpay'
                  ? 'razorpay'
                  : item.gatewaySlug;

            const { data, error } = await client.functions.invoke('verify-payment', {
              body: {
                paymentId: item.paymentId,
                orderId: item.gatewayOrderId,
                gateway,
                pollOnly: '1',
              },
            });

            if (!error && (data as { success?: boolean })?.success) {
              resolved += 1;
            }
          }

          return { polled: items.length, resolved };
        },
      }),
      invalidatesTags: ['Payments'],
    }),

    verifyOpenPoolConsistency: builder.query<{ openPoolCount: number }, void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('count_collection_open_pool');
          if (error) throw error;
          return { openPoolCount: Number(data ?? 0) };
        },
      }),
    }),

    createGstInvoiceRequest: builder.mutation<
      { id: string; alreadyExists?: boolean; status?: string },
      { paymentId: string; gstin: string; businessName?: string; billingAddress?: string }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { data: { user } } = await client.auth.getUser();
          const customerId = await resolveCustomerUserId(client, user?.id);

          const { data: existing } = await client
            .from('gst_invoice_requests')
            .select('id, status')
            .eq('payment_id', body.paymentId)
            .maybeSingle();

          if (existing) {
            return {
              id: String(existing.id),
              alreadyExists: true,
              status: String(existing.status),
            };
          }

          const { data, error } = await client
            .from('gst_invoice_requests')
            .insert({
              payment_id: body.paymentId,
              customer_id: customerId,
              gstin: body.gstin.trim().toUpperCase(),
              business_name: body.businessName?.trim() ?? null,
              billing_address: body.billingAddress?.trim() ?? null,
            })
            .select('id')
            .single();

          if (error) {
            if (error.code === '23505') {
              const { data: dup } = await client
                .from('gst_invoice_requests')
                .select('id, status')
                .eq('payment_id', body.paymentId)
                .maybeSingle();
              if (dup) {
                return {
                  id: String(dup.id),
                  alreadyExists: true,
                  status: String(dup.status),
                };
              }
            }
            throw error;
          }

          return { id: String(data.id) };
        },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Payments', id: `gst-${arg.paymentId}` },
        'Payments',
      ],
    }),

    getGstInvoiceRequestForPayment: builder.query<
      { id: string; status: string; created_at: string } | null,
      string
    >({
      query: (paymentId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('gst_invoice_requests')
            .select('id, status, created_at')
            .eq('payment_id', paymentId)
            .maybeSingle();
          if (error) throw error;
          if (!data) return null;
          return {
            id: String(data.id),
            status: String(data.status),
            created_at: String(data.created_at),
          };
        },
      }),
      providesTags: (_r, _e, paymentId) => [{ type: 'Payments', id: `gst-${paymentId}` }],
    }),
  }),
});

export const {
  useGetPaymentsQuery,
  useGetPaymentDetailQuery,
  useGetCustomerPaymentDetailQuery,
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
  useRecordManualPaymentMutation,
  useGetPaymentActivityTimelineQuery,
  useGetBankAccountsQuery,
  useGetBankAccountsAdminQuery,
  useUpsertBankAccountMutation,
  useVerifyOpenPoolConsistencyQuery,
  useCreateGstInvoiceRequestMutation,
  useGetGstInvoiceRequestForPaymentQuery,
  usePollPendingPaymentsMutation,
} = paymentCollectionApi;

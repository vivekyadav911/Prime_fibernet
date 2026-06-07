import type {
  AppRole,
  AuditLog,
  InventoryItem,
  LeaveRequest,
  Officer,
  Payment,
  PaymentGateway,
  PaymentOrderResponse,
  Payslip,
  Plan,
  RequestActivity,
  ServiceRequest,
  Shift,
  Subscription,
  UserProfile,
} from '@prime/types';

import { getSupabase } from '@/services/supabase';

import { baseApi } from './baseApi';

function mapPlan(row: Record<string, unknown>): Plan {
  const speedFromLegacy =
    row.speed_mbps != null
      ? Number(row.speed_mbps)
      : parseInt(String(row.speed ?? '').replace(/\D/g, ''), 10) || 0;
  let features: string[] = [];
  if (Array.isArray(row.features)) features = row.features as string[];
  else if (row.features && typeof row.features === 'object')
    features = Object.values(row.features as Record<string, unknown>).map(String);

  return {
    id: row.id as string,
    name: row.name as string,
    speedMbps: speedFromLegacy,
    price: Number(row.price),
    validityDays: Number(row.validity_days ?? 30),
    features,
    isActive: row.is_active as boolean,
  };
}

function mapRequest(row: Record<string, unknown>): ServiceRequest {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    officerId: (row.officer_id as string) ?? null,
    requestType: row.request_type as ServiceRequest['requestType'],
    status: row.status as ServiceRequest['status'],
    priority: row.priority as ServiceRequest['priority'],
    address: row.address as string,
    description: (row.description as string) ?? undefined,
    createdAt: row.created_at as string,
  };
}

async function getOfficerIdForUser(userId: string): Promise<string | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from('officers')
    .select('id')
    .or(`user_id.eq.${userId},auth_user_id.eq.${userId}`)
    .maybeSingle();
  return data?.id ?? null;
}

export const plansApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlans: builder.query<Plan[], void>({
      queryFn: async () => {
        const { data, error } = await getSupabase().from('plans').select('*').eq('is_active', true);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: (data ?? []).map(mapPlan) };
      },
      providesTags: ['Plans'],
    }),
    createPlan: builder.mutation<void, Partial<Plan>>({
      queryFn: async (plan) => {
        const { error } = await getSupabase().from('plans').insert({
          name: plan.name,
          speed_mbps: plan.speedMbps,
          price: plan.price,
          validity_days: plan.validityDays,
          features: plan.features,
          is_active: plan.isActive ?? true,
        });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Plans'],
    }),
    updatePlan: builder.mutation<void, { id: string } & Partial<Plan>>({
      queryFn: async ({ id, ...plan }) => {
        const { error } = await getSupabase()
          .from('plans')
          .update({
            name: plan.name,
            speed_mbps: plan.speedMbps,
            price: plan.price,
            validity_days: plan.validityDays,
            features: plan.features,
            is_active: plan.isActive,
          })
          .eq('id', id);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Plans'],
    }),
    deletePlan: builder.mutation<void, string>({
      queryFn: async (id) => {
        const { error } = await getSupabase().from('plans').update({ is_active: false }).eq('id', id);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Plans'],
    }),
  }),
});

export const subscriptionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getActiveSubscription: builder.query<Subscription | null, string>({
      queryFn: async (userId) => {
        const { data, error } = await getSupabase()
          .from('subscriptions')
          .select('*, plans(name)')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('end_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        if (!data) return { data: null };
        const endAt = data.end_at as string;
        const daysUntilExpiry = Math.ceil((new Date(endAt).getTime() - Date.now()) / 86400000);
        return {
          data: {
            id: data.id,
            userId: data.user_id,
            planId: data.plan_id,
            planName: (data.plans as { name?: string })?.name,
            startAt: data.start_at,
            endAt,
            status: data.status,
            daysUntilExpiry,
          },
        };
      },
      providesTags: ['Subscriptions'],
    }),
  }),
});

export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPaymentHistory: builder.query<Payment[], string>({
      queryFn: async (userId) => {
        const { data, error } = await getSupabase()
          .from('user_payments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            userId: row.user_id,
            amount: Number(row.amount),
            paymentStatus: row.payment_status,
            transactionId: row.transaction_id,
            invoiceUrl: row.invoice_url ?? null,
            createdAt: row.created_at,
          })),
        };
      },
      providesTags: ['Payments'],
    }),
    createPaymentOrder: builder.mutation<
      PaymentOrderResponse,
      { userId: string; userName: string; userEmail: string; userPhone?: string; planId: string; planName: string; amount: number }
    >({
      queryFn: async (body) => {
        const { data, error } = await getSupabase().functions.invoke('create-payment-order', {
          body: {
            userId: body.userId,
            userName: body.userName,
            userEmail: body.userEmail,
            userPhone: body.userPhone ?? '',
            planId: body.planId,
            planName: body.planName,
            amount: body.amount,
            paymentMethod: 'gateway',
          },
        });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        const res = data as Record<string, unknown>;
        return {
          data: {
            paymentId: String(res.paymentId ?? ''),
            orderId: String(res.orderId ?? ''),
            checkoutUrl: (res.checkoutUrl ?? res.paymentUrl ?? null) as string | null,
            gateway: (res.gateway ?? 'easybuzz') as PaymentGateway,
            amount: Number(res.amount ?? body.amount),
          },
        };
      },
      invalidatesTags: ['Payments', 'Subscriptions'],
    }),
    verifyPayment: builder.mutation<{ success: boolean }, { paymentId: string; orderId: string; gateway: PaymentGateway }>({
      queryFn: async (body) => {
        const { data, error } = await getSupabase().functions.invoke('verify-payment', { body });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: { success: Boolean((data as { success?: boolean })?.success) } };
      },
      invalidatesTags: ['Payments', 'Subscriptions'],
    }),
    getInvoiceUrl: builder.mutation<string, string>({
      queryFn: async (paymentId) => {
        const { data, error } = await getSupabase().functions.invoke('invoice-generator', {
          body: { paymentId },
        });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: String((data as { url?: string })?.url ?? '') };
      },
    }),
    processRefund: builder.mutation<void, { paymentId: string; amount: number; reason: string }>({
      queryFn: async (body) => {
        const { error } = await getSupabase().functions.invoke('process-refund', { body });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Payments'],
    }),
  }),
});

export const requestsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyRequests: builder.query<ServiceRequest[], string>({
      queryFn: async (userId) => {
        const { data, error } = await getSupabase()
          .from('service_requests')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: (data ?? []).map(mapRequest) };
      },
      providesTags: ['Requests'],
    }),
    getAllRequests: builder.query<ServiceRequest[], void>({
      queryFn: async () => {
        const { data, error } = await getSupabase()
          .from('service_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: (data ?? []).map(mapRequest) };
      },
      providesTags: ['Requests'],
    }),
    getAssignedRequests: builder.query<ServiceRequest[], string | void>({
      queryFn: async (userId) => {
        const sb = getSupabase();
        let query = sb.from('service_requests').select('*').order('priority', { ascending: true });
        if (userId) {
          const officerId = await getOfficerIdForUser(userId);
          if (officerId) query = query.eq('officer_id', officerId);
        }
        const { data, error } = await query;
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: (data ?? []).map(mapRequest) };
      },
      providesTags: ['Requests'],
    }),
    getRequestActivities: builder.query<RequestActivity[], string>({
      queryFn: async (requestId) => {
        const { data, error } = await getSupabase()
          .from('request_activities')
          .select('*')
          .eq('request_id', requestId)
          .order('created_at', { ascending: true });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            requestId: row.request_id,
            note: row.note,
            createdAt: row.created_at,
          })),
        };
      },
    }),
    createRequest: builder.mutation<void, { userId: string; requestType: string; address: string; description?: string }>({
      queryFn: async (body) => {
        const { error } = await getSupabase().from('service_requests').insert({
          user_id: body.userId,
          request_type: body.requestType,
          address: body.address,
          description: body.description,
          status: 'pending',
          priority: 'P2',
        });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Requests'],
    }),
    updateRequestStatus: builder.mutation<void, { id: string; status: string; note?: string; officerId?: string }>({
      queryFn: async ({ id, status, note, officerId }) => {
        const { error } = await getSupabase().from('service_requests').update({ status }).eq('id', id);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        if (note && officerId) {
          await getSupabase().from('request_activities').insert({
            request_id: id,
            officer_id: officerId,
            note,
          });
        }
        return { data: undefined };
      },
      invalidatesTags: ['Requests'],
    }),
    assignRequest: builder.mutation<void, { id: string; officerId: string; priority?: string }>({
      queryFn: async ({ id, officerId, priority }) => {
        const { error } = await getSupabase()
          .from('service_requests')
          .update({ officer_id: officerId, status: 'assigned', priority: priority ?? 'P2' })
          .eq('id', id);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Requests'],
    }),
    escalateRequest: builder.mutation<void, string>({
      queryFn: async (id) => {
        const { error } = await getSupabase()
          .from('service_requests')
          .update({ is_escalated: true, priority: 'P0' })
          .eq('id', id);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Requests'],
    }),
  }),
});

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllUsers: builder.query<UserProfile[], void>({
      queryFn: async () => {
        const { data, error } = await getSupabase().from('users').select('*').limit(200);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            email: row.email,
            name: row.name,
            phone: row.phone,
            role: row.role as AppRole,
            isBlocked: row.is_blocked,
          })),
        };
      },
      providesTags: ['Users'],
    }),
    updateProfile: builder.mutation<void, { userId: string; name?: string; phone?: string; notificationPrefs?: Record<string, boolean> }>({
      queryFn: async ({ userId, name, phone, notificationPrefs }) => {
        const updates: Record<string, unknown> = {};
        if (name) updates.name = name;
        if (phone) updates.phone = phone;
        if (notificationPrefs) updates.notification_prefs = notificationPrefs;
        const { error } = await getSupabase().from('users').update(updates).eq('id', userId);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Users'],
    }),
    blockUser: builder.mutation<void, { userId: string; reason: string }>({
      queryFn: async ({ userId, reason }) => {
        const { error } = await getSupabase().from('users').update({ is_blocked: true }).eq('id', userId);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        await getSupabase().from('audit_logs').insert({
          actor_id: userId,
          action: 'user_blocked',
          target_entity: 'users',
          new_values: { reason },
          status: 'SUCCESS',
        });
        return { data: undefined };
      },
      invalidatesTags: ['Users'],
    }),
    unblockUser: builder.mutation<void, string>({
      queryFn: async (userId) => {
        const { error } = await getSupabase().from('users').update({ is_blocked: false }).eq('id', userId);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Users'],
    }),
  }),
});

export const officersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOfficers: builder.query<Officer[], void>({
      queryFn: async () => {
        const { data, error } = await getSupabase().from('officers').select('*, users(name, email)');
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            userId: row.user_id,
            name: (row.users as { name?: string })?.name ?? 'Officer',
            email: (row.users as { email?: string })?.email ?? '',
            region: row.region,
            availabilityStatus: row.availability_status,
          })),
        };
      },
      providesTags: ['Officers'],
    }),
    inviteOfficer: builder.mutation<void, { email: string; name: string; phone: string; region: string }>({
      queryFn: async (body) => {
        const { error } = await getSupabase().functions.invoke('provision-officer-auth', { body });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Officers'],
    }),
    updateOfficer: builder.mutation<void, { id: string; region?: string; availabilityStatus?: string }>({
      queryFn: async ({ id, region, availabilityStatus }) => {
        const { error } = await getSupabase()
          .from('officers')
          .update({ region, availability_status: availabilityStatus })
          .eq('id', id);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Officers'],
    }),
    clockIn: builder.mutation<void, { userId: string; latitude: number; longitude: number }>({
      queryFn: async ({ userId, latitude, longitude }) => {
        const officerId = await getOfficerIdForUser(userId);
        if (!officerId) return { error: { status: 'CUSTOM_ERROR', error: 'Officer profile not found' } };
        const { error } = await getSupabase().from('shifts').insert({
          officer_id: officerId,
          shift_date: new Date().toISOString().slice(0, 10),
          check_in_time: new Date().toISOString(),
          status: 'active',
          location: `POINT(${longitude} ${latitude})`,
        });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        await getSupabase().from('officers').update({ availability_status: 'available' }).eq('id', officerId);
        return { data: undefined };
      },
      invalidatesTags: ['Shifts', 'Officers'],
    }),
    clockOut: builder.mutation<void, { userId: string; shiftId?: string }>({
      queryFn: async ({ userId, shiftId }) => {
        const officerId = await getOfficerIdForUser(userId);
        if (!officerId) return { error: { status: 'CUSTOM_ERROR', error: 'Officer profile not found' } };
        let targetShiftId = shiftId;
        if (!targetShiftId) {
          const { data: active } = await getSupabase()
            .from('shifts')
            .select('id')
            .eq('officer_id', officerId)
            .eq('status', 'active')
            .order('check_in_time', { ascending: false })
            .limit(1)
            .maybeSingle();
          targetShiftId = active?.id;
        }
        if (!targetShiftId) return { error: { status: 'CUSTOM_ERROR', error: 'No active shift found' } };
        const { error } = await getSupabase()
          .from('shifts')
          .update({ check_out_time: new Date().toISOString(), status: 'completed' })
          .eq('id', targetShiftId);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Shifts'],
    }),
    getActiveShift: builder.query<Shift | null, string>({
      queryFn: async (userId) => {
        const officerId = await getOfficerIdForUser(userId);
        if (!officerId) return { data: null };
        const { data, error } = await getSupabase()
          .from('shifts')
          .select('*')
          .eq('officer_id', officerId)
          .eq('status', 'active')
          .order('check_in_time', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        if (!data) return { data: null };
        return {
          data: {
            id: data.id,
            officerId: data.officer_id,
            shiftDate: data.shift_date,
            status: data.status,
            checkInTime: data.check_in_time,
            checkOutTime: data.check_out_time,
          },
        };
      },
      providesTags: ['Shifts'],
    }),
    getShiftHistory: builder.query<Shift[], string>({
      queryFn: async (userId) => {
        const officerId = await getOfficerIdForUser(userId);
        if (!officerId) return { data: [] };
        const { data, error } = await getSupabase()
          .from('shifts')
          .select('*')
          .eq('officer_id', officerId)
          .order('shift_date', { ascending: false })
          .limit(30);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            officerId: row.officer_id,
            shiftDate: row.shift_date,
            status: row.status,
            checkInTime: row.check_in_time,
            checkOutTime: row.check_out_time,
          })),
        };
      },
      providesTags: ['Shifts'],
    }),
    getInventory: builder.query<InventoryItem[], string>({
      queryFn: async (userId) => {
        const officerId = await getOfficerIdForUser(userId);
        if (!officerId) return { data: [] };
        const { data: assignments, error: aErr } = await getSupabase()
          .from('inventory_assignments')
          .select('item_id')
          .eq('assigned_to_id', officerId)
          .eq('status', 'assigned');
        if (aErr) return { error: { status: 'CUSTOM_ERROR', error: aErr.message } };
        const itemIds = (assignments ?? []).map((a) => a.item_id).filter(Boolean);
        if (!itemIds.length) return { data: [] };
        const { data, error } = await getSupabase().from('inventory_items').select('*').in('id', itemIds);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            name: row.name,
            sku: row.sku,
            category: row.category,
            quantity: row.quantity,
            status: row.status,
          })),
        };
      },
      providesTags: ['Inventory'],
    }),
    getPayslips: builder.query<Payslip[], string>({
      queryFn: async (userId) => {
        const officerId = await getOfficerIdForUser(userId);
        if (!officerId) return { data: [] };
        const { data, error } = await getSupabase()
          .from('payslips')
          .select('*')
          .eq('officer_id', officerId)
          .order('month', { ascending: false });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            officerId: row.officer_id,
            month: row.month,
            base: Number(row.base),
            bonuses: Number(row.bonuses),
            deductions: Number(row.deductions),
            netPay: Number(row.net_pay),
            pdfUrl: row.pdf_url,
          })),
        };
      },
      providesTags: ['Payslips'],
    }),
    createLeaveRequest: builder.mutation<void, { userId: string; leaveType: string; startDate: string; endDate: string; reason: string }>({
      queryFn: async ({ userId, leaveType, startDate, endDate, reason }) => {
        const officerId = await getOfficerIdForUser(userId);
        if (!officerId) return { error: { status: 'CUSTOM_ERROR', error: 'Officer profile not found' } };
        const { error } = await getSupabase().from('leave_requests').insert({
          officer_id: officerId,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason,
          status: 'pending',
        });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Leave'],
    }),
    getLeaveRequests: builder.query<LeaveRequest[], string>({
      queryFn: async (userId) => {
        const officerId = await getOfficerIdForUser(userId);
        if (!officerId) return { data: [] };
        const { data, error } = await getSupabase()
          .from('leave_requests')
          .select('*')
          .eq('officer_id', officerId)
          .order('created_at', { ascending: false });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            officerId: row.officer_id,
            leaveType: row.leave_type,
            startDate: row.start_date,
            endDate: row.end_date,
            reason: row.reason,
            status: row.status,
          })),
        };
      },
      providesTags: ['Leave'],
    }),
  }),
});

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardKpis: builder.query<
      { activeSubscribers: number; mrr: number; openRequests: number; officersOnline: number },
      void
    >({
      queryFn: async () => {
        const sb = getSupabase();
        const [subs, payments, requests, officers] = await Promise.all([
          sb.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          sb.from('user_payments').select('amount').eq('payment_status', 'success'),
          sb.from('service_requests').select('id', { count: 'exact', head: true }).neq('status', 'resolved'),
          sb.from('officers').select('id', { count: 'exact', head: true }).eq('availability_status', 'available'),
        ]);
        const mrr = (payments.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
        return {
          data: {
            activeSubscribers: subs.count ?? 0,
            mrr,
            openRequests: requests.count ?? 0,
            officersOnline: officers.count ?? 0,
          },
        };
      },
      providesTags: ['Analytics'],
    }),
    getAnalyticsReport: builder.query<
      { totalRevenue: number; avgResolutionHours: number; attendanceRate: number },
      void
    >({
      queryFn: async () => {
        const sb = getSupabase();
        const [payments, requests, shifts] = await Promise.all([
          sb.from('user_payments').select('amount').eq('payment_status', 'success'),
          sb.from('service_requests').select('created_at, status').eq('status', 'resolved').limit(100),
          sb.from('shifts').select('status').limit(200),
        ]);
        const totalRevenue = (payments.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
        const completedShifts = (shifts.data ?? []).filter((s) => s.status === 'completed').length;
        const attendanceRate = shifts.data?.length ? (completedShifts / shifts.data.length) * 100 : 0;
        return {
          data: {
            totalRevenue,
            avgResolutionHours: 24,
            attendanceRate: Math.round(attendanceRate),
          },
        };
      },
      providesTags: ['Analytics'],
    }),
  }),
});

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPublicCompanySettings: builder.query<Record<string, string | null>, void>({
      queryFn: async () => {
        const { data, error } = await getSupabase().rpc('get_public_company_settings');
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        const row = Array.isArray(data) ? data[0] : data;
        return { data: (row ?? {}) as Record<string, string | null> };
      },
      providesTags: ['Settings'],
    }),
    getAdminSettings: builder.query<Record<string, unknown>, void>({
      queryFn: async () => {
        const { data, error } = await getSupabase().from('general_settings').select('*').limit(1).maybeSingle();
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: data ?? {} };
      },
      providesTags: ['Settings'],
    }),
    updateAdminSettings: builder.mutation<void, Record<string, unknown>>({
      queryFn: async (updates) => {
        const { data: existing } = await getSupabase().from('general_settings').select('id').limit(1).maybeSingle();
        if (existing?.id) {
          const { error } = await getSupabase().from('general_settings').update(updates).eq('id', existing.id);
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        } else {
          const { error } = await getSupabase().from('general_settings').insert(updates);
          if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
        return { data: undefined };
      },
      invalidatesTags: ['Settings'],
    }),
    getFaqs: builder.query<{ id: string; question: string; answer: string }[], void>({
      queryFn: async () => {
        const { data, error } = await getSupabase()
          .from('faqs')
          .select('id, question, answer')
          .eq('is_published', true)
          .order('order_index', { ascending: true });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: data ?? [] };
      },
      providesTags: ['Settings'],
    }),
  }),
});

export const auditApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query<AuditLog[], { action?: string } | void>({
      queryFn: async (filters) => {
        let query = getSupabase().from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
        if (filters?.action) query = query.eq('action', filters.action);
        const { data, error } = await query;
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            timestamp: row.timestamp,
            actorId: row.actor_id,
            action: row.action,
            targetEntity: row.target_entity,
            status: row.status,
          })),
        };
      },
      providesTags: ['Audit'],
    }),
  }),
});

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendBulkNotification: builder.mutation<void, { title: string; body: string; audience: string }>({
      queryFn: async (body) => {
        const { error } = await getSupabase().from('notification_queue').insert({
          title: body.title,
          body: body.body,
          audience: body.audience,
          status: 'pending',
        });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Notifications'],
    }),
    getNotificationHistory: builder.query<
      { id: string; title: string; audience: string; status: string; sentCount: number; createdAt: string }[],
      void
    >({
      queryFn: async () => {
        const { data, error } = await getSupabase()
          .from('notification_queue')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            title: row.title,
            audience: row.audience,
            status: row.status,
            sentCount: row.sent_count ?? 0,
            createdAt: row.created_at,
          })),
        };
      },
      providesTags: ['Notifications'],
    }),
  }),
});

export const chatbotApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendChatMessage: builder.mutation<{ reply: string }, { message: string; userId: string }>({
      queryFn: async (body) => {
        await getSupabase().from('chatbot_conversations').insert({
          user_id: body.userId,
          message: body.message,
        });
        const { data, error } = await getSupabase().functions.invoke('gemini-rag-chatbot', { body });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        const reply = (data as { reply?: string })?.reply ?? 'Sorry, I could not help right now.';
        const { data: conv } = await getSupabase()
          .from('chatbot_conversations')
          .select('id')
          .eq('user_id', body.userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (conv?.id) {
          await getSupabase().from('chatbot_conversations').update({ reply }).eq('id', conv.id);
        }
        return { data: { reply } };
      },
    }),
  }),
});

export const {
  useGetPlansQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useDeletePlanMutation,
} = plansApi;
export const { useGetActiveSubscriptionQuery } = subscriptionsApi;
export const {
  useGetPaymentHistoryQuery,
  useCreatePaymentOrderMutation,
  useVerifyPaymentMutation,
  useGetInvoiceUrlMutation,
  useProcessRefundMutation,
} = paymentsApi;
export const {
  useGetMyRequestsQuery,
  useGetAllRequestsQuery,
  useGetAssignedRequestsQuery,
  useGetRequestActivitiesQuery,
  useCreateRequestMutation,
  useUpdateRequestStatusMutation,
  useAssignRequestMutation,
  useEscalateRequestMutation,
} = requestsApi;
export const {
  useGetAllUsersQuery,
  useUpdateProfileMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
} = usersApi;
export const {
  useGetOfficersQuery,
  useInviteOfficerMutation,
  useUpdateOfficerMutation,
  useClockInMutation,
  useClockOutMutation,
  useGetActiveShiftQuery,
  useGetShiftHistoryQuery,
  useGetInventoryQuery,
  useGetPayslipsQuery,
  useCreateLeaveRequestMutation,
  useGetLeaveRequestsQuery,
} = officersApi;
export const { useGetDashboardKpisQuery, useGetAnalyticsReportQuery } = analyticsApi;
export const {
  useGetPublicCompanySettingsQuery,
  useGetAdminSettingsQuery,
  useUpdateAdminSettingsMutation,
  useGetFaqsQuery,
} = settingsApi;
export const { useGetAuditLogsQuery } = auditApi;
export const { useSendBulkNotificationMutation, useGetNotificationHistoryQuery } = notificationsApi;
export const { useSendChatMessageMutation } = chatbotApi;

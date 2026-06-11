import type { Payment, Subscription } from '@prime/types';
import type {
  AdminUserDetail,
  AdminUserListItem,
  AdminUsersListParams,
  AdminUsersListResponse,
  CreateAdminUserInput,
} from '@/types/api/admin';

import { buildUserSearchOrFilter } from '@/utils/searchQuery';

import { baseApi } from './baseApi';

type SubscriptionEmbed = {
  status?: string;
  plans?: { name?: string } | null;
};

function resolvePlanName(subs: SubscriptionEmbed[] | null | undefined): string {
  const list = subs ?? [];
  const active = list.find((s) => s.status === 'active') ?? list[0];
  const name = active?.plans?.name;
  if (!name) return 'Standard';
  if (/standard/i.test(name)) return 'Standard';
  return name;
}

function resolveStatus(
  isBlocked: boolean,
  expiryDate: string | null | undefined,
): AdminUserListItem['status'] {
  if (isBlocked) return 'blocked';
  if (expiryDate && new Date(expiryDate) < new Date()) return 'expired';
  return 'active';
}

function mapUserRow(row: Record<string, unknown>): AdminUserListItem {
  const subs = row.subscriptions as SubscriptionEmbed[] | null | undefined;
  const isBlocked = Boolean(row.is_blocked);
  return {
    id: row.id as string,
    legacyUserId: row.legacy_user_id != null ? Number(row.legacy_user_id) : null,
    name: row.name as string,
    username: (row.username as string) ?? null,
    email: row.email as string,
    phone: (row.phone as string) ?? null,
    city: (row.city as string) ?? null,
    planName: resolvePlanName(subs),
    status: resolveStatus(isBlocked, row.expiry_date as string | null | undefined),
    isBlocked,
  };
}

export const adminUsersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminUsers: builder.query<AdminUsersListResponse, AdminUsersListParams>({
      query: (filters) => ({
        handler: async (client) => {
          const page = filters.page ?? 1;
          const limit = filters.limit ?? 50;
          const offset = (page - 1) * limit;

          let query = client
            .from('users')
            .select(
              'id, email, name, phone, city, username, legacy_user_id, is_blocked, expiry_date',
              { count: 'exact' },
            )
            .eq('role', 'customer');

          const search = filters.search?.trim();
          if (search) {
            query = query.or(buildUserSearchOrFilter(search));
          }

          if (filters.city && filters.city !== 'all') {
            query = query.ilike('city', filters.city);
          }

          if (filters.blockFilter === 'blocked') {
            query = query.eq('is_blocked', true);
          } else if (filters.blockFilter === 'unblocked') {
            query = query.eq('is_blocked', false);
          }

          if (filters.status === 'blocked') {
            query = query.eq('is_blocked', true);
          } else if (filters.status === 'active') {
            query = query.eq('is_blocked', false);
          } else if (filters.status === 'expired') {
            query = query.lt('expiry_date', new Date().toISOString());
          }

          query = query.order('legacy_user_id', { ascending: false, nullsFirst: false });

          const { data, error, count } = await query.range(offset, offset + limit - 1);
          if (error) throw error;

          const userIds = (data ?? []).map((row) => row.id as string);
          const planByUserId = new Map<string, string>();

          if (userIds.length > 0) {
            const { data: subs, error: subsError } = await client
              .from('subscriptions')
              .select('user_id, status, plans(name)')
              .in('user_id', userIds)
              .eq('status', 'active');

            if (subsError) throw subsError;

            for (const sub of subs ?? []) {
              const userId = sub.user_id as string;
              if (planByUserId.has(userId)) continue;
              const plan = sub.plans as { name?: string } | null;
              planByUserId.set(userId, plan?.name ?? 'Standard');
            }
          }

          const { data: cityRows } = await client
            .from('users')
            .select('city')
            .eq('role', 'customer')
            .not('city', 'is', null);

          const cities = [
            ...new Set(
              (cityRows ?? [])
                .map((r) => String(r.city ?? '').trim())
                .filter((c) => c.length > 0),
            ),
          ].sort((a, b) => a.localeCompare(b));

          return {
            items: (data ?? []).map((row) => {
              const mapped = mapUserRow(row as Record<string, unknown>);
              const planName = planByUserId.get(mapped.id);
              if (planName) {
                mapped.planName = /standard/i.test(planName) ? 'Standard' : planName;
              }
              return mapped;
            }),
            total: count ?? 0,
            page,
            limit,
            cities,
          };
        },
      }),
      providesTags: ['Users'],
    }),

    getAdminUserDetail: builder.query<AdminUserDetail, string>({
      query: (userId) => ({
        handler: async (client) => {
          const { data: user, error } = await client.from('users').select('*').eq('id', userId).maybeSingle();
          if (error) throw error;
          if (!user) throw new Error('User not found');

          const { data: sub } = await client
            .from('subscriptions')
            .select('*, plans(name, speed_mbps)')
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();

          const plan = sub?.plans as { name?: string; speed_mbps?: number } | null;
          return {
            id: user.id as string,
            name: user.name as string,
            email: user.email as string,
            phone: (user.phone as string) ?? null,
            address: (user.address as string) ?? null,
            city: (user.city as string) ?? null,
            joinDate: (user.created_at as string) ?? '',
            isBlocked: Boolean(user.is_blocked),
            planName: plan?.name ?? null,
            planSpeed: plan?.speed_mbps != null ? Number(plan.speed_mbps) : null,
            expiryDate: (sub?.end_at as string) ?? (user.expiry_date as string) ?? null,
            autoRenew: Boolean(sub?.auto_renew),
          };
        },
      }),
      providesTags: (_r, _e, id) => [{ type: 'Users', id }],
    }),

    updateAdminUser: builder.mutation<void, { id: string; name?: string; email?: string; phone?: string; address?: string }>({
      query: ({ id, ...updates }) => ({
        handler: async (client) => {
          const { error } = await client.from('users').update(updates).eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Users', id }, 'Users'],
    }),

    getUserSubscriptions: builder.query<Subscription[], string>({
      query: (userId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('subscriptions')
            .select('*, plans(name)')
            .eq('user_id', userId)
            .order('start_at', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            userId: row.user_id as string,
            planId: row.plan_id as string,
            planName: (row.plans as { name?: string })?.name,
            startAt: row.start_at as string,
            endAt: row.end_at as string,
            status: row.status as 'active' | 'expired' | 'cancelled',
          }));
        },
      }),
      providesTags: ['Subscriptions'],
    }),

    getUserPayments: builder.query<Payment[], string>({
      query: (userId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('user_payments')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            userId: row.user_id as string,
            amount: Number(row.amount),
            paymentStatus: row.payment_status as Payment['paymentStatus'],
            transactionId: (row.gateway_transaction_id as string) ?? null,
            createdAt: row.created_at as string,
          }));
        },
      }),
      providesTags: ['Payments'],
    }),

    createAdminUser: builder.mutation<{ userId: string }, CreateAdminUserInput>({
      query: (body) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('admin-create-customer', { body });
          if (error) throw error;
          const result = data as { userId?: string; error?: string };
          if (result.error) throw new Error(result.error);
          if (!result.userId) throw new Error('User creation failed');
          return { userId: result.userId };
        },
      }),
      invalidatesTags: ['Users'],
    }),

    exportUsers: builder.mutation<string, { format: 'csv' | 'pdf' }>({
      query: ({ format }) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('admin-backup-export', {
            body: { tables: ['users'], format },
          });
          if (error) throw error;
          return String((data as { url?: string })?.url ?? '');
        },
      }),
    }),
  }),
});

export const {
  useGetAdminUsersQuery,
  useGetAdminUserDetailQuery,
  useUpdateAdminUserMutation,
  useCreateAdminUserMutation,
  useGetUserSubscriptionsQuery,
  useGetUserPaymentsQuery,
  useExportUsersMutation,
} = adminUsersApi;

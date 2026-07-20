import type { AppRole, UserProfile } from '@prime/types';
import type { Session, User } from '@supabase/supabase-js';

import { baseApi } from './baseApi';

export type AuthCredentials = {
  session: Session;
  user: User;
};

export type SignUpRequest = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: AppRole;
};

export type OtpSendRequest = {
  identifier: string;
};

export type OtpVerifyRequest = {
  identifier: string;
  token: string;
};

function normalizePhone(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? trimmed : `+91${digits}`;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    signInWithPassword: builder.mutation<AuthCredentials, { email: string; password: string }>({
      query: ({ email, password }) => ({
        handler: async (client) => {
          const { data, error } = await client.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (error) throw error;
          if (!data.session || !data.user) throw new Error('Session incomplete');
          return { session: data.session, user: data.user };
        },
      }),
      invalidatesTags: ['Auth', 'Profile', 'Subscriptions'],
    }),

    signUp: builder.mutation<AuthCredentials | null, SignUpRequest>({
      query: ({ name, email, phone, password, role = 'customer' }) => ({
        handler: async (client) => {
          const { data, error } = await client.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { name, phone, app_role: role, role } },
          });
          if (error) throw error;
          if (!data.session || !data.user) return null;
          return { session: data.session, user: data.user };
        },
      }),
      invalidatesTags: ['Auth', 'Profile'],
    }),

    signOut: builder.mutation<void, void>({
      query: () => ({
        handler: async (client) => {
          const { error } = await client.auth.signOut();
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Auth', 'Profile', 'Subscriptions', 'Payments', 'Requests'],
    }),

    sendLoginOtp: builder.mutation<void, OtpSendRequest>({
      query: ({ identifier }) => ({
        handler: async (client) => {
          const id = identifier.trim();
          // Closed, pre-provisioned user base: NEVER create a new account from a
          // typo or a non-customer email. shouldCreateUser:false is mandatory.
          if (id.includes('@')) {
            const { error } = await client.auth.signInWithOtp({
              email: id,
              options: { shouldCreateUser: false },
            });
            if (error) throw error;
            return;
          }
          const phone = normalizePhone(id);
          const { error } = await client.auth.signInWithOtp({
            phone,
            options: { shouldCreateUser: false },
          });
          if (error) throw error;
        },
      }),
    }),

    verifyLoginOtp: builder.mutation<AuthCredentials, OtpVerifyRequest>({
      query: ({ identifier, token }) => ({
        handler: async (client) => {
          const id = identifier.trim();
          const { data, error } = id.includes('@')
            ? await client.auth.verifyOtp({ email: id, token: token.trim(), type: 'email' })
            : await client.auth.verifyOtp({
                phone: normalizePhone(id),
                token: token.trim(),
                type: 'sms',
              });
          if (error) throw error;
          if (!data.session || !data.user) throw new Error('Session incomplete');
          return { session: data.session, user: data.user };
        },
      }),
      invalidatesTags: ['Auth', 'Profile', 'Subscriptions'],
    }),

    resetPassword: builder.mutation<void, { email: string }>({
      query: ({ email }) => ({
        handler: async (client) => {
          const { error } = await client.auth.resetPasswordForEmail(email.trim());
          if (error) throw error;
        },
      }),
    }),

    changePassword: builder.mutation<void, { newPassword: string }>({
      query: ({ newPassword }) => ({
        handler: async (client) => {
          const { error } = await client.auth.updateUser({ password: newPassword });
          if (error) throw error;
        },
      }),
    }),

    requestAccountDeletion: builder.mutation<void, { userId: string }>({
      query: ({ userId }) => ({
        handler: async (client) => {
          const { error: fnError } = await client.functions.invoke('delete-user-account', {
            body: { userId },
          });
          if (!fnError) return;

          await client.from('audit_logs').insert({
            actor_id: userId,
            action: 'account_deletion_requested',
            target_entity: 'users',
            target_id: userId,
            status: 'PENDING',
            new_values: { retention_days: 90 },
          });
        },
      }),
      invalidatesTags: ['Auth', 'Profile'],
    }),

    getLoginState: builder.query<
      { role: string | null; passwordSet: boolean; lastFullLoginAt: string | null },
      void
    >({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('get_login_state');
          if (error) throw error;
          const row = (Array.isArray(data) ? data[0] : data) as
            | { role?: string | null; password_set?: boolean; last_full_login_at?: string | null }
            | undefined;
          return {
            role: row?.role ?? null,
            passwordSet: Boolean(row?.password_set),
            lastFullLoginAt: row?.last_full_login_at ?? null,
          };
        },
      }),
      providesTags: ['Auth'],
    }),

    // First-login claim: set the user's own password, then flip password_set + touch login.
    completePasswordSetup: builder.mutation<void, { newPassword: string }>({
      query: ({ newPassword }) => ({
        handler: async (client) => {
          const { error: updErr } = await client.auth.updateUser({ password: newPassword });
          if (updErr) throw updErr;
          const { error } = await client.rpc('complete_password_setup');
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Auth', 'Profile'],
    }),

    // Slide the 30-day silent-session window after any real login.
    touchFullLogin: builder.mutation<void, void>({
      query: () => ({
        handler: async (client) => {
          const { error } = await client.rpc('touch_full_login');
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Auth'],
    }),

    // Admin-only one-time migration runner: provisions auth.users for legacy
    // customers/officers in batches. Loop client-side until remaining === 0.
    provisionUserAuthBatch: builder.mutation<
      { created: number; linkedExisting: number; failed: number; remaining: number },
      { batchSize?: number } | void
    >({
      query: (arg) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('provision-user-auth', {
            body: { batchSize: (arg && 'batchSize' in arg ? arg.batchSize : undefined) ?? 200 },
          });
          if (error) throw error;
          const r = (data ?? {}) as {
            created?: number;
            linkedExisting?: number;
            failed?: number;
            remaining?: number;
          };
          return {
            created: r.created ?? 0,
            linkedExisting: r.linkedExisting ?? 0,
            failed: r.failed ?? 0,
            remaining: r.remaining ?? 0,
          };
        },
      }),
    }),

    getCustomerProfile: builder.query<UserProfile, void>({
      query: () => ({
        handler: async (client) => {
          const { data: auth } = await client.auth.getUser();
          if (!auth.user) throw new Error('Sign in required');

          const { data: customerId, error: cidErr } = await client.rpc('current_customer_user_id');
          if (cidErr) throw cidErr;

          const resolvedId = customerId ?? auth.user.id;
          const { data, error } = await client
            .from('users')
            .select('id, email, name, phone, role, is_blocked, customer_id')
            .eq('id', resolvedId)
            .maybeSingle();
          if (error) throw error;
          if (!data) throw new Error('Profile not found');

          return {
            id: String(data.id),
            email: String(data.email ?? auth.user.email ?? ''),
            name: String(data.name ?? ''),
            phone: (data.phone as string) ?? null,
            role: (data.role as AppRole) ?? 'customer',
            isBlocked: Boolean(data.is_blocked),
          };
        },
      }),
      providesTags: ['Profile'],
    }),

    getCustomerUserRecord: builder.query<Record<string, unknown>, void>({
      query: () => ({
        handler: async (client) => {
          const { data: auth } = await client.auth.getUser();
          if (!auth.user) throw new Error('Sign in required');

          const { data: customerId, error: cidErr } = await client.rpc('current_customer_user_id');
          if (cidErr) throw cidErr;

          const resolvedId = customerId ?? auth.user.id;
          const { data, error } = await client
            .from('users')
            .select(
              'id, email, name, phone, role, customer_id, address, city, district, pincode, profile_picture_url, notification_prefs, created_at',
            )
            .eq('id', resolvedId)
            .single();
          if (error) throw error;
          return data as Record<string, unknown>;
        },
      }),
      providesTags: ['Profile'],
    }),

    getOfficerSessionProfile: builder.query<Record<string, unknown>, void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('get_officer_session_profile');
          if (error) throw error;
          if (!data || typeof data !== 'object') throw new Error('Officer profile not found');
          const map = { ...(data as Record<string, unknown>) };
          delete map.password_hash;
          return map;
        },
      }),
      providesTags: ['Profile', 'Officers'],
    }),

    getUserByEmail: builder.query<Record<string, unknown> | null, string>({
      query: (email) => ({
        handler: async (client) => {
          const { data, error } = await client.from('users').select('*').eq('email', email).maybeSingle();
          if (error) throw error;
          return data;
        },
      }),
      providesTags: ['Profile'],
    }),

    getUserById: builder.query<Record<string, unknown> | null, string>({
      query: (userId) => ({
        handler: async (client) => {
          const { data, error } = await client.from('users').select('*').eq('id', userId).maybeSingle();
          if (error) throw error;
          return data;
        },
      }),
      providesTags: ['Profile'],
    }),

    updateUserProfile: builder.mutation<
      void,
      {
        userId: string;
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
        profilePictureUrl?: string;
        notificationPrefs?: Record<string, boolean>;
      }
    >({
      query: ({ userId, name, email, phone, address, profilePictureUrl, notificationPrefs }) => ({
        handler: async (client) => {
          const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
          };
          if (name != null) updates.name = name;
          if (email != null) updates.email = email;
          if (phone != null) updates.phone = phone;
          if (address != null) updates.address = address;
          if (profilePictureUrl) updates.profile_picture_url = profilePictureUrl;
          if (notificationPrefs) updates.notification_prefs = notificationPrefs;
          const { error } = await client.from('users').update(updates).eq('id', userId);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Profile', 'Users', 'CustomerDashboard'],
    }),

    getAllUsers: builder.query<UserProfile[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.from('users').select('*').limit(200);
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            email: row.email as string,
            name: row.name as string,
            phone: (row.phone as string) ?? null,
            role: row.role as AppRole,
            isBlocked: Boolean(row.is_blocked),
          }));
        },
      }),
      providesTags: ['Users'],
    }),

    blockUser: builder.mutation<void, { userId: string; reason: string }>({
      query: ({ userId, reason }) => ({
        handler: async (client) => {
          const { error } = await client.from('users').update({ is_blocked: true }).eq('id', userId);
          if (error) throw error;
          await client.from('audit_logs').insert({
            actor_id: userId,
            action: 'user_blocked',
            target_entity: 'users',
            new_values: { reason },
            status: 'SUCCESS',
          });
        },
      }),
      invalidatesTags: ['Users'],
    }),

    unblockUser: builder.mutation<void, string>({
      query: (userId) => ({
        handler: async (client) => {
          const { error } = await client.from('users').update({ is_blocked: false }).eq('id', userId);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Users'],
    }),

    markNotificationRead: builder.mutation<void, string>({
      query: (notificationId) => ({
        handler: async (client) => {
          const queueResult = await client
            .from('notification_queue')
            .update({ status: 'sent' })
            .eq('id', notificationId);
          if (!queueResult.error) return;
          const { error } = await client
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Notifications'],
    }),

    getUserNotifications: builder.query<
      { id: string; title: string; body: string; createdAt: string; isRead: boolean }[],
      string
    >({
      query: (userId) => ({
        handler: async (client) => {
          let rows: Record<string, unknown>[] = [];
          const queue = await client
            .from('notification_queue')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);
          if (!queue.error && queue.data) {
            rows = queue.data as Record<string, unknown>[];
          } else {
            const fallback = await client
              .from('notifications')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(50);
            if (fallback.error) throw fallback.error;
            rows = (fallback.data ?? []) as Record<string, unknown>[];
          }
          return rows.map((row) => ({
            id: String(row.id),
            title: String(row.title ?? 'Notification'),
            body: String(row.body ?? ''),
            createdAt: String(row.created_at),
            isRead: row.status === 'sent' || row.is_read === true,
          }));
        },
      }),
      providesTags: ['Notifications'],
    }),
  }),
});

export const {
  useSignInWithPasswordMutation,
  useSignUpMutation,
  useSignOutMutation,
  useSendLoginOtpMutation,
  useVerifyLoginOtpMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
  useRequestAccountDeletionMutation,
  useGetLoginStateQuery,
  useCompletePasswordSetupMutation,
  useTouchFullLoginMutation,
  useProvisionUserAuthBatchMutation,
  useGetCustomerProfileQuery,
  useGetCustomerUserRecordQuery,
  useGetOfficerSessionProfileQuery,
  useGetUserByEmailQuery,
  useGetUserByIdQuery,
  useUpdateUserProfileMutation,
  useGetAllUsersQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
  useMarkNotificationReadMutation,
  useGetUserNotificationsQuery,
} = authApi;

// Backward-compatible aliases used by existing screens
export const useUpdateProfileMutation = useUpdateUserProfileMutation;

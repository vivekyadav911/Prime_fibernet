import type { PortalNotification, PortalNotificationType } from '@/types/payments';

import { baseApi } from './baseApi';

function patchAllNotificationListsAsRead(
  dispatch: (action: unknown) => { undo: () => void },
  getState: () => unknown,
): Array<{ undo: () => void }> {
  const patches: Array<{ undo: () => void }> = [];
  const apiState = (getState() as { api: { queries: Record<string, { data?: PortalNotification[]; originalArgs?: unknown }> } }).api;

  for (const key of Object.keys(apiState.queries)) {
    if (!key.startsWith('getPortalNotifications(')) continue;
    const entry = apiState.queries[key];
    if (!entry?.data) continue;
    patches.push(
      dispatch(
        portalNotificationsApi.util.updateQueryData(
          'getPortalNotifications',
          entry.originalArgs as { limit?: number } | void,
          (draft) => {
            for (const notification of draft) {
              notification.is_read = true;
            }
          },
        ),
      ) as { undo: () => void },
    );
  }

  patches.push(
    dispatch(
      portalNotificationsApi.util.updateQueryData('getPortalUnreadCount', undefined, () => 0),
    ) as { undo: () => void },
  );

  return patches;
}

function mapPortalNotification(row: Record<string, unknown>): PortalNotification {
  return {
    id: String(row.id),
    recipient_auth_id: String(row.recipient_auth_id),
    recipient_officer_id: (row.recipient_officer_id as string) ?? null,
    type: String(row.type) as PortalNotificationType,
    category: (row.category as PortalNotification['category']) ?? null,
    title: String(row.title),
    body: (row.body as string) ?? null,
    action_url: (row.action_url as string) ?? null,
    data: (row.data as Record<string, unknown>) ?? {},
    is_read: Boolean(row.is_read),
    created_at: String(row.created_at),
  };
}

export const portalNotificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPortalNotifications: builder.query<PortalNotification[], { limit?: number } | void>({
      query: (params) => ({
        handler: async (client) => {
          const limit = params?.limit ?? 50;
          const { data: auth } = await client.auth.getUser();
          if (!auth.user) return [];

          const { data, error } = await client
            .from('portal_notifications')
            .select('*')
            .eq('recipient_auth_id', auth.user.id)
            .eq('is_test', false)
            .order('created_at', { ascending: false })
            .limit(limit);
          if (error) throw error;
          return (data ?? []).map((row) => mapPortalNotification(row as Record<string, unknown>));
        },
      }),
      providesTags: ['PortalNotifications'],
    }),

    getPortalUnreadCount: builder.query<number, void>({
      query: () => ({
        handler: async (client) => {
          const { data: auth } = await client.auth.getUser();
          if (!auth.user) return 0;

          const { count, error } = await client
            .from('portal_notifications')
            .select('id', { count: 'exact', head: true })
            .eq('recipient_auth_id', auth.user.id)
            .eq('is_test', false)
            .eq('is_read', false);
          if (error) throw error;
          return count ?? 0;
        },
      }),
      providesTags: ['PortalNotifications'],
    }),

    markPortalNotificationRead: builder.mutation<void, string>({
      query: (id) => ({
        handler: async (client) => {
          const { error } = await client
            .from('portal_notifications')
            .update({ is_read: true })
            .eq('id', id);
          if (error) throw error;
        },
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        const patches: Array<{ undo: () => void }> = [];
        const apiState = (getState() as { api: { queries: Record<string, { data?: PortalNotification[]; originalArgs?: unknown }> } }).api;

        for (const key of Object.keys(apiState.queries)) {
          if (!key.startsWith('getPortalNotifications(')) continue;
          const entry = apiState.queries[key];
          if (!entry?.data) continue;
          patches.push(
            dispatch(
              portalNotificationsApi.util.updateQueryData(
                'getPortalNotifications',
                entry.originalArgs as { limit?: number } | void,
                (draft) => {
                  const row = draft.find((n) => n.id === id);
                  if (row) row.is_read = true;
                },
              ),
            ) as { undo: () => void },
          );
        }

        try {
          await queryFulfilled;
          dispatch(portalNotificationsApi.util.invalidateTags(['PortalNotifications']));
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
    }),

    markAllPortalNotificationsRead: builder.mutation<void, void>({
      query: () => ({
        handler: async (client) => {
          const { data: auth } = await client.auth.getUser();
          if (!auth.user) return;

          const { error } = await client
            .from('portal_notifications')
            .update({ is_read: true })
            .eq('recipient_auth_id', auth.user.id)
            .eq('is_read', false);
          if (error) throw error;
        },
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        const patches = patchAllNotificationListsAsRead(dispatch, getState);
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
    }),
  }),
});

export const {
  useGetPortalNotificationsQuery,
  useGetPortalUnreadCountQuery,
  useMarkPortalNotificationReadMutation,
  useMarkAllPortalNotificationsReadMutation,
} = portalNotificationsApi;

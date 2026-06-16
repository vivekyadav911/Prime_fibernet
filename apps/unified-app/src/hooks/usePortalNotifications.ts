import {
  useGetPortalNotificationsQuery,
  useGetPortalUnreadCountQuery,
  useMarkAllPortalNotificationsReadMutation,
  useMarkPortalNotificationReadMutation,
} from '@/services/api/portalNotificationsApi';

export function usePortalNotifications(limit = 50) {
  const list = useGetPortalNotificationsQuery({ limit });
  const unread = useGetPortalUnreadCountQuery();
  const [markRead] = useMarkPortalNotificationReadMutation();
  const [markAllRead] = useMarkAllPortalNotificationsReadMutation();

  return {
    notifications: list.data ?? [],
    unreadCount: unread.data ?? 0,
    isLoading: list.isLoading,
    isError: list.isError,
    error: list.error,
    refetch: list.refetch,
    markRead,
    markAllRead,
  };
}

import {
  useGetPortalNotificationsQuery,
  useGetPortalUnreadCountQuery,
  useMarkAllPortalNotificationsReadMutation,
  useMarkPortalNotificationReadMutation,
} from '@/services/api/portalNotificationsApi';

export function useCustomerNotifications() {
  const { data, isLoading, error, refetch } = useGetPortalNotificationsQuery({ limit: 100 });
  const { data: unreadCount = 0 } = useGetPortalUnreadCountQuery();
  const [markRead] = useMarkPortalNotificationReadMutation();
  const [markAllRead] = useMarkAllPortalNotificationsReadMutation();

  return {
    notifications: data ?? [],
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead: (id: string) => markRead(id),
    markAllAsRead: () => markAllRead(),
  };
}

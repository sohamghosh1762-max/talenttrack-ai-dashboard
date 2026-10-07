import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/index.ts";
import type {
  INotification,
  NotificationQueryParams,
  PaginatedNotificationsResponse,
} from "../../server/types/notification-types.ts";

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (params?: NotificationQueryParams) => [...notificationKeys.lists(), params ?? {}] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

/**
 * Hook to retrieve authenticated user's persistent notifications
 */
export function useNotifications(
  params?: NotificationQueryParams,
  options: { enabled?: boolean; refetchInterval?: number | false } = {},
) {
  return useQuery<PaginatedNotificationsResponse>({
    queryKey: notificationKeys.list(params),
    queryFn: async () => {
      const res = await apiClient.get<PaginatedNotificationsResponse>("/api/notifications", {
        params: params as Record<string, string | number | boolean>,
      });
      return res || { notifications: [], total: 0, page: 1, limit: 20, totalPages: 0, unreadCount: 0 };
    },
    enabled: options.enabled ?? true,
    refetchInterval: options.refetchInterval ?? 30_000,
    staleTime: 10_000,
  });
}

/**
 * Hook to retrieve unread notification count
 */
export function useUnreadNotificationsCount(
  options: { enabled?: boolean; refetchInterval?: number | false } = {},
) {
  return useQuery<{ count: number }>({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const res = await apiClient.get<{ count: number }>("/api/notifications/unread-count");
      return res || { count: 0 };
    },
    enabled: options.enabled ?? true,
    refetchInterval: options.refetchInterval ?? 30_000,
    staleTime: 10_000,
  });
}

/**
 * Hook to mark a single notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      return apiClient.patch<INotification>(`/api/notifications/${notificationId}/read`);
    },
    onSuccess: (updatedNotification) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });

      // Optimistically update list items in cache if present
      queryClient.setQueriesData<PaginatedNotificationsResponse>(
        { queryKey: notificationKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            unreadCount: Math.max(0, old.unreadCount - 1),
            notifications: old.notifications.map((n) =>
              n.id === updatedNotification.id ? { ...n, readAt: updatedNotification.readAt || new Date().toISOString() } : n,
            ),
          };
        },
      );

      // Optimistically decrement unread count
      queryClient.setQueryData<{ count: number }>(notificationKeys.unreadCount(), (old) => ({
        count: Math.max(0, (old?.count || 1) - 1),
      }));
    },
  });
}

/**
 * Hook to mark all notifications as read for current user
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient.post<{ count: number; success: boolean }>("/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });

      // Optimistically update list in cache
      queryClient.setQueriesData<PaginatedNotificationsResponse>(
        { queryKey: notificationKeys.lists() },
        (old) => {
          if (!old) return old;
          const now = new Date().toISOString();
          return {
            ...old,
            unreadCount: 0,
            notifications: old.notifications.map((n) => ({
              ...n,
              readAt: n.readAt || now,
            })),
          };
        },
      );

      queryClient.setQueryData<{ count: number }>(notificationKeys.unreadCount(), { count: 0 });
    },
  });
}

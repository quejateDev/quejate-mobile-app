import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { useAuth } from '@core/auth/useAuth';
import type { Notification } from '@core/types';

export function useNotifications() {
  const { user } = useAuth();

  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: (): Promise<Notification[]> =>
      apiClient
        .get(ENDPOINTS.NOTIFICATIONS.LIST, { skipAuth401: true })
        .then((r) => r.data as Notification[]),
    enabled: !!user,
    staleTime: 0,
    retry: false,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, { notificationId: string }>({
    mutationFn: (body) =>
      apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_READ, body, { skipAuth401: true }).then((r) => r.data),
    onMutate: async ({ notificationId }) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      queryClient.setQueryData<Notification[]>(['notifications'], (prev) =>
        prev?.map((n) => (n.id === notificationId ? { ...n, read: true } : n)) ?? [],
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

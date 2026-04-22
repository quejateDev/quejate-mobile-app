import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { PQRS } from '@core/types';

interface LikeResponse {
  likes: number;
  liked: boolean;
}

interface OptimisticContext {
  previous: PQRS | undefined;
}

export function useUpdateStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; data: PQRS; message: string }, unknown, { status: 'RESOLVED' }>({
    mutationFn: (body) =>
      apiClient.patch(ENDPOINTS.PQR.STATUS(id), body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pqr', id] });
      queryClient.invalidateQueries({ queryKey: ['pqrs'] });
    },
  });
}

export function useUpdatePrivacy(id: string) {
  const queryClient = useQueryClient();

  return useMutation<PQRS, unknown, { private: boolean }>({
    mutationFn: (body) =>
      apiClient.patch(ENDPOINTS.PQR.PRIVACY(id), body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pqr', id] });
      queryClient.invalidateQueries({ queryKey: ['pqrs'] });
    },
  });
}

export function useLikePQR(id: string) {
  const queryClient = useQueryClient();

  return useMutation<LikeResponse, unknown, { userId: string }, OptimisticContext>({
    mutationFn: (body) =>
      apiClient.post<LikeResponse>(ENDPOINTS.PQR.LIKE(id), body).then((r) => r.data),
    onMutate: async ({ userId }) => {
      await queryClient.cancelQueries({ queryKey: ['pqr', id] });
      const previous = queryClient.getQueryData<PQRS>(['pqr', id]);
      if (previous) {
        const alreadyLiked = previous.likes.some((l) => l.userId === userId);
        queryClient.setQueryData<PQRS>(['pqr', id], {
          ...previous,
          likes: alreadyLiked
            ? previous.likes.filter((l) => l.userId !== userId)
            : [...previous.likes, { id: 'optimistic', userId }],
          _count: {
            likes: (previous._count?.likes ?? 0) + (alreadyLiked ? -1 : 1),
            comments: previous._count?.comments ?? 0,
          },
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['pqr', id], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pqr', id] });
      queryClient.invalidateQueries({ queryKey: ['pqrs'] });
      queryClient.invalidateQueries({ queryKey: ['pqrs-by-user'] });
    },
  });
}

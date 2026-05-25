import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { debugLog } from '@core/debug/debugStore';
import { getErrorStatus, isUnauthorized } from '@shared/utils/httpError';
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

  return useMutation<
    { success: boolean; data: PQRS; message: string },
    unknown,
    { private: boolean },
    OptimisticContext
  >({
    mutationFn: (body) =>
      apiClient.patch(ENDPOINTS.PQR.PRIVACY(id), body).then((r) => r.data),
    onMutate: async ({ private: newPrivate }) => {
      await queryClient.cancelQueries({ queryKey: ['pqr', id] });
      const previous = queryClient.getQueryData<PQRS>(['pqr', id]);
      if (previous) {
        queryClient.setQueryData<PQRS>(['pqr', id], { ...previous, private: newPrivate });
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

/**
 * Encapsula el toggle de privacidad reutilizado por la tarjeta (ojo + sheet) y el detalle:
 * dispara la mutación, loguea en DebugScreen y muestra error (ignorando 401).
 */
export function useTogglePrivacy(
  pqr: Pick<PQRS, 'id' | 'private'>,
  onDone?: () => void,
) {
  const mutation = useUpdatePrivacy(pqr.id);

  function toggle() {
    if (mutation.isPending) return;
    const newPrivate = !pqr.private;
    debugLog('info', `PRIVACY mutate -> private=${newPrivate}`);
    mutation.mutate(
      { private: newPrivate },
      {
        onSuccess: (response) => {
          debugLog('info', `PRIVACY OK private=${response?.data?.private ?? '?'}`);
          onDone?.();
        },
        onError: (error) => {
          const status = getErrorStatus(error);
          debugLog('err', `PRIVACY FAIL status=${status ?? 'NET'}`);
          if (isUnauthorized(error)) return;
          Alert.alert(
            'Error',
            `No se pudo cambiar la privacidad (${status ?? 'red'}). Revisa el DebugScreen.`,
          );
        },
      },
    );
  }

  return { toggle, isPending: mutation.isPending };
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

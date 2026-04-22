import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { Comment } from '@core/types';

export function useComments(pqrId: string) {
  return useQuery<Comment[]>({
    queryKey: ['pqr', pqrId, 'comments'],
    queryFn: () =>
      apiClient.get<Comment[]>(ENDPOINTS.PQR.COMMENTS(pqrId)).then((r) => r.data),
    enabled: !!pqrId,
  });
}

interface AddCommentInput {
  text: string;
  userId: string;
}

export function useAddComment(pqrId: string) {
  const queryClient = useQueryClient();

  return useMutation<Comment, unknown, AddCommentInput>({
    mutationFn: (body) =>
      apiClient
        .post<Comment>(ENDPOINTS.PQR.COMMENTS(pqrId), body)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pqr', pqrId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['pqr', pqrId] });
    },
  });
}

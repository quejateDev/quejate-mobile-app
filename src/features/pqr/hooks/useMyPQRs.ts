import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { useAuth } from '@core/auth/useAuth';
import type { PQRS } from '@core/types';

interface MyPQRsResponse {
  pqrs: PQRS[];
  hasMore: boolean;
  nextPage: number | null;
}

export function useMyPQRs() {
  const { user } = useAuth();
  const userId = user?.id;

  return useInfiniteQuery<MyPQRsResponse>({
    queryKey: ['pqrs-by-user', userId],
    queryFn: ({ pageParam }) =>
      apiClient
        .get(ENDPOINTS.PQR.BY_USER(userId!), {
          params: { page: pageParam, limit: 10 },
        })
        .then((r) => {
          const d = r.data as Record<string, unknown>;
          return {
            pqrs: (d.pqrs ?? d.data ?? []) as PQRS[],
            hasMore: (d.hasMore as boolean) ?? false,
            nextPage: (d.nextPage as number | null) ?? null,
          };
        }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled: !!userId,
    staleTime: 0,
  });
}

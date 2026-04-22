import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { PQRS, PQRSType } from '@core/types';

interface PQRListResponse {
  pqrs: PQRS[];
  hasMore: boolean;
  nextPage: number | null;
}

interface PQRListFilters {
  type?: PQRSType;
}

export function usePQRList(filters: PQRListFilters = {}) {
  return useInfiniteQuery<PQRListResponse>({
    queryKey: ['pqrs', filters],
    queryFn: ({ pageParam }) =>
      apiClient
        .get<PQRListResponse>(ENDPOINTS.PQR.LIST, {
          params: { page: pageParam, limit: 10, ...filters },
        })
        .then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });
}

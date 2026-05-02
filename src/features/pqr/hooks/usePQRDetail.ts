import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { PQRS } from '@core/types';

export function usePQRDetail(id: string) {
  return useQuery<PQRS, Error & { response?: { status?: number } }>({
    queryKey: ['pqr', id],
    queryFn: () => apiClient.get<PQRS>(ENDPOINTS.PQR.DETAIL(id)).then((r) => r.data),
    enabled: !!id,
    retry: (failureCount, error) => {
      if (error?.response?.status === 403 || error?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });
}

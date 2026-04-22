import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { PQRS } from '@core/types';

export function usePQRDetail(id: string) {
  return useQuery<PQRS>({
    queryKey: ['pqr', id],
    queryFn: () => apiClient.get<PQRS>(ENDPOINTS.PQR.DETAIL(id)).then((r) => r.data),
    enabled: !!id,
  });
}

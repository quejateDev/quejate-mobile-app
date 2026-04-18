import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { Department, Entity, PQRConfig } from '@core/types';

export function usePQRConfig(entityId: string | undefined) {
  const query = useQuery<{ pqrConfig: PQRConfig | null; departments: Department[] }>({
    queryKey: ['pqr-config', entityId],
    queryFn: async () => {
      const res = await apiClient.get<Entity>(ENDPOINTS.ENTITIES.DETAIL(entityId!));
      return {
        pqrConfig: res.data.pqrConfig ?? null,
        departments: res.data.departments ?? [],
      };
    },
    enabled: !!entityId,
  });

  return {
    pqrConfig: query.data?.pqrConfig ?? null,
    entityDepartments: query.data?.departments ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
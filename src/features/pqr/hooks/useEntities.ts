import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { Entity } from '@core/types';

interface UseEntitiesParams {
  departmentId?: string;
  municipalityId?: string;
  categoryId?: string;
}

export function useEntities({ departmentId, municipalityId, categoryId }: UseEntitiesParams = {}) {
  const query = useQuery<Entity[]>({
    queryKey: ['entities', { departmentId, municipalityId, categoryId }],
    queryFn: () =>
      apiClient
        .get<Entity[]>(ENDPOINTS.ENTITIES.LIST, {
          params: { departmentId, municipalityId, categoryId },
        })
        .then((r) => r.data),
  });

  return {
    entities: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { Entity } from '@core/types';

interface EntityListResponse {
  data: Entity[];
  pagination?: { total: number; page: number; limit: number; totalPages: number };
}

interface EntityFilters {
  categoryId?: string;
  search?: string;
  limit?: number;
}

export function useEntities(filters: EntityFilters = {}) {
  return useQuery<Entity[]>({
    queryKey: ['entities', filters],
    queryFn: async () => {
      const res = await apiClient.get<EntityListResponse | Entity[]>(ENDPOINTS.ENTITIES.LIST, {
        params: { limit: 100, ...filters },
      });
      const raw = res.data;
      return Array.isArray(raw) ? raw : raw.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

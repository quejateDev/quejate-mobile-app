import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { Category } from '@core/types';

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get<Category[] | { data: Category[] }>(ENDPOINTS.CATEGORIES.LIST);
      const raw = res.data;
      return Array.isArray(raw) ? raw : raw.data;
    },
    staleTime: 1000 * 60 * 10,
  });
}

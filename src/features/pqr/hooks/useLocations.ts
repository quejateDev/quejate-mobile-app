import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { RegionalDepartment, Municipality } from '@core/types';

export function useDepartments() {
  const query = useQuery<RegionalDepartment[]>({
    queryKey: ['departments'],
    queryFn: () =>
      apiClient
        .get<RegionalDepartment[]>(ENDPOINTS.LOCATIONS.DEPARTMENTS)
        .then((r) => r.data),
  });

  return {
    departments: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useMunicipalities(departmentId: string | undefined) {
  const query = useQuery<Municipality[]>({
    queryKey: ['municipalities', departmentId],
    queryFn: () =>
      apiClient
        .get<Municipality[]>(ENDPOINTS.LOCATIONS.MUNICIPALITIES, {
          params: { departmentId },
        })
        .then((r) => r.data),
    enabled: !!departmentId,
  });

  return {
    municipalities: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

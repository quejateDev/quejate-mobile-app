import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { PQRS } from '@core/types';

interface PQRListPage {
  pqrs?: PQRS[];
}

// Propaga el PQR fresco del detalle a las listas cacheadas (feed y "Mis PQRSD").
// Las tabs no se desmontan al navegar, así que sin esto una tarjeta puede quedar
// mostrando un estado viejo (p. ej. "Pendiente/Vencida" cuando ya fue resuelta)
// aunque el detalle muestre el estado real.
function syncListCaches(client: QueryClient, fresh: PQRS) {
  for (const rootKey of [['pqrs'], ['pqrs-by-user']]) {
    client.setQueriesData<InfiniteData<PQRListPage>>({ queryKey: rootKey }, (old) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          pqrs: page.pqrs?.map((p) => (p.id === fresh.id ? { ...p, ...fresh } : p)),
        })),
      };
    });
  }
}

export function usePQRDetail(id: string) {
  const queryClient = useQueryClient();

  return useQuery<PQRS, Error & { response?: { status?: number } }>({
    queryKey: ['pqr', id],
    queryFn: async () => {
      const { data } = await apiClient.get<PQRS>(ENDPOINTS.PQR.DETAIL(id));
      syncListCaches(queryClient, data);
      return data;
    },
    enabled: !!id,
    retry: (failureCount, error) => {
      if (error?.response?.status === 403 || error?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });
}

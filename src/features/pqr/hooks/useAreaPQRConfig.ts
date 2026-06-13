import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { CustomField } from '@core/types';

/** /area/{id}/pqr-config devuelve los campos personalizados a nivel de ÁREA.
 *  El backend puede omitir id/isForAnonymous, así que normalizamos para que
 *  encajen con CustomField y puedan mostrarse junto a los campos de la entidad. */
interface AreaPQRConfigResponse {
  customFields?: Array<Partial<CustomField> & { name: string }>;
}

export function useAreaPQRConfig(areaId: string | undefined) {
  const query = useQuery<CustomField[]>({
    queryKey: ['area-pqr-config', areaId],
    queryFn: async () => {
      const res = await apiClient.get<AreaPQRConfigResponse>(
        ENDPOINTS.AREAS.PQR_CONFIG(areaId!),
      );
      const fields = res.data?.customFields ?? [];
      return fields.map((f) => ({
        id: f.id ?? `area-${f.name}`,
        name: f.name,
        type: f.type ?? 'text',
        placeholder: f.placeholder,
        required: f.required ?? false,
        isForAnonymous: f.isForAnonymous ?? true,
      }));
    },
    enabled: !!areaId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    areaCustomFields: query.data ?? [],
    isLoading: query.isLoading,
  };
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { OversightEntity } from '@core/types';
import type { EntityLocation, GenerateOversightInput } from '@features/pqr/utils/oversightLetter';
import { classifyOversightSend } from '@features/pqr/utils/oversightSend';
import type { OversightSendResult } from '@features/pqr/utils/oversightSend';

/** Lo que se lee de `GET /entities/:id` para ubicar a la entidad. */
interface EntityLocationResponse {
  regionalDepartmentId?: string | null;
  municipalityId?: string | null;
  RegionalDepartment?: { name?: string | null } | null;
  Municipality?: { name?: string | null } | null;
}

export type OversightEntitiesResult =
  /** La entidad no tiene departamento: el servidor no podría escoger entes. */
  | { kind: 'no-department' }
  | { kind: 'ok'; entities: OversightEntity[]; location: EntityLocation };

/**
 * Los entes de control competentes para la entidad de una PQRSD.
 *
 * Como en la web (`usePQRFollowUp.ts`, `fetchOversightEntitiesByLocation`): la
 * ubicación es la **de la entidad**, que se lee de `GET /entities/:id`, y no la
 * del ciudadano. Es también la regla con que el servidor valida el envío, así
 * que un ente de esta lista es uno al que se le puede enviar.
 *
 * Devuelve además los nombres del departamento y del municipio, que van en el
 * oficio.
 */
export function useOversightEntities(entityId: string | undefined) {
  return useQuery<OversightEntitiesResult>({
    queryKey: ['oversight-entities', entityId],
    queryFn: async () => {
      const { data: entity } = await apiClient.get<EntityLocationResponse>(
        ENDPOINTS.ENTITIES.DETAIL(entityId!),
      );
      if (!entity?.regionalDepartmentId) return { kind: 'no-department' };

      // Sin municipio el servidor devuelve solo los entes departamentales.
      const params: Record<string, string> = {
        regionalDepartmentId: entity.regionalDepartmentId,
      };
      if (entity.municipalityId) params.municipalityId = entity.municipalityId;

      const { data } = await apiClient.get<OversightEntity[]>(ENDPOINTS.OVERSIGHT.BY_LOCATION, {
        params,
      });

      return {
        kind: 'ok',
        // Guard defensivo: la pantalla no puede romperse por una forma inesperada.
        entities: Array.isArray(data) ? data : [],
        location: {
          departmentName: entity.RegionalDepartment?.name ?? null,
          cityName: entity.Municipality?.name ?? null,
        },
      };
    },
    enabled: !!entityId,
  });
}

interface DocumentResponse {
  document?: string;
  /** Solo llega si el servidor guardó el oficio. */
  id?: string;
}

export interface GeneratedOversightLetter {
  content: string;
  /**
   * `null` cuando el servidor no consiguió guardar el oficio (el guardado es
   * best effort). Sin él no hay PDF ni envío: los dos salen del documento
   * guardado.
   */
  id: string | null;
}

/**
 * Redacta el oficio al ente de control → `POST /legal-docs/document` con
 * `documentType: 'oversight'`, la ruta que usa la web. Timeout ~30 s, como la
 * tutela: el servidor espera a la IA hasta 25 s.
 */
export function useGenerateOversightLetter() {
  const queryClient = useQueryClient();

  return useMutation<GeneratedOversightLetter, unknown, GenerateOversightInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<DocumentResponse>(
        ENDPOINTS.LEGAL_DOCS.DOCUMENT,
        { documentType: 'oversight', ...input },
        { timeout: 30000 },
      );
      const content = res.data?.document?.trim();
      if (!content) throw new Error('El servidor no devolvió el oficio.');

      return { content, id: typeof res.data.id === 'string' ? res.data.id : null };
    },
    // El oficio guardado entra en «Mis documentos legales»: que la lista no
    // siga sirviendo la de antes durante el staleTime global.
    onSuccess: (letter) => {
      if (letter.id) void queryClient.invalidateQueries({ queryKey: ['legal-docs'] });
    },
  });
}

/**
 * Tiempo de espera del envío. El servidor maqueta el PDF, espera al correo
 * hasta 10 s y luego intenta la confirmación al ciudadano, así que los 15 s
 * por defecto del cliente cortarían envíos que salen bien, y un corte se lee
 * como «sin confirmar».
 */
const SEND_TIMEOUT_MS = 45000;

/**
 * Envía el oficio guardado al ente de control → `POST /legal-docs/:id/send`.
 *
 * De la app solo salen identificadores: el servidor maqueta el oficio desde el
 * documento guardado y saca el buzón de su directorio.
 *
 * No lanza: devuelve el resultado ya clasificado (ver `classifyOversightSend`).
 * Sin respuesta (tiempo agotado, red cortada) es `unconfirmed`: la petición
 * pudo llegar y el oficio salir antes del corte.
 */
export async function sendOversightLetter(
  documentId: string,
  target: { pqrId: string; oversightEntityId: string },
): Promise<OversightSendResult> {
  try {
    const res = await apiClient.post(ENDPOINTS.LEGAL_DOCS.SEND(documentId), target, {
      timeout: SEND_TIMEOUT_MS,
    });
    return classifyOversightSend(res);
  } catch (error) {
    return classifyOversightSend((error as { response?: { status: number } })?.response);
  }
}

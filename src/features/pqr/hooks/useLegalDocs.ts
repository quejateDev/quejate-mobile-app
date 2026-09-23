import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';

export interface GenerateTutelaInput {
  fullName: string;
  documentNumber: string;
  department: string; // NOMBRE, no id
  city: string; // NOMBRE, no id
  rightViolated: string; // uno de FUNDAMENTAL_RIGHTS
  entity: string; // nombre de la entidad demandada
  pqrType: string; // etiqueta legible, ej. "Queja"
  pqrDate: string; // "YYYY-MM-DD"
  daysExceeded: number; // no puede ser null
  pqrDescription: string;
}

interface TutelaResponse {
  tutela: string;
  /**
   * Aditivo. Identifica el documento guardado, y es lo único que permite pedir
   * su PDF después. Puede no venir: ver `GeneratedTutela.id`.
   */
  id?: string;
}

export interface GeneratedTutela {
  content: string;
  /**
   * `null` cuando el backend no consiguió guardar el documento. El guardado es
   * best effort a propósito: si la base falla, el servidor registra el fallo y
   * devuelve el texto igual, porque perder una redacción ya pagada sería peor.
   * La pantalla debe mostrar el texto siempre; solo el PDF depende de esto.
   */
  id: string | null;
}

const BACKEND_ERROR_TEXT = 'Error generando el contenido';

/**
 * Genera la acción de tutela vía POST /legal-docs (endpoint propio del backend, no el
 * gateway externo del web). Devuelve el texto y, si el guardado salió bien, el id con
 * el que luego se pide el PDF. Timeout ~30s.
 */
export function useGenerateTutela() {
  return useMutation<GeneratedTutela, unknown, GenerateTutelaInput>({
    mutationFn: async (body) => {
      const res = await apiClient.post<TutelaResponse>(ENDPOINTS.LEGAL_DOCS.TUTELA, body, {
        timeout: 30000,
      });
      const content = res.data?.tutela?.trim();

      // Guarda de A-27: el servicio llegó a devolver el texto del error como si
      // fuera el documento, con HTTP 200. Sin esta comprobación el ciudadano se
      // lleva "Error generando el contenido" como si fuera su tutela.
      if (!content || content === BACKEND_ERROR_TEXT) {
        throw new Error('No se pudo generar la tutela. Intenta de nuevo.');
      }

      return { content, id: res.data.id ?? null };
    },
  });
}

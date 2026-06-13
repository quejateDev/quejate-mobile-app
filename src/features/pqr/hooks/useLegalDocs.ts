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
}

const BACKEND_ERROR_TEXT = 'Error generando el contenido';

/**
 * Genera la acción de tutela vía POST /legal-docs (endpoint propio del backend, no el
 * gateway externo del web). Devuelve texto plano. El backend NO persiste nada ni vincula
 * la tutela a la PQRSD. Timeout ~25s. Maneja tanto el 500 como el caso 200 con texto de
 * error de GPT.
 */
export function useGenerateTutela() {
  return useMutation<string, unknown, GenerateTutelaInput>({
    mutationFn: async (body) => {
      const res = await apiClient.post<TutelaResponse>(ENDPOINTS.LEGAL_DOCS.TUTELA, body, {
        timeout: 30000,
      });
      const tutela = res.data?.tutela?.trim();
      if (!tutela || tutela === BACKEND_ERROR_TEXT) {
        throw new Error('No se pudo generar la tutela. Intenta de nuevo.');
      }
      return tutela;
    },
  });
}

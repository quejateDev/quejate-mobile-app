import { typeMap } from '@core/types';
import type { PQRS } from '@core/types';
import { resolveOverdue } from '@features/pqr/utils/businessDays';
import { retryAfterSeconds } from '@features/pqr/utils/oversightSend';

/**
 * Cuerpo de `POST /legal-docs/document` con `documentType: 'oversight'`, sin
 * ese discriminante (lo añade el hook).
 *
 * Son los mismos datos con que redacta la web (`usePQRFollowUp.ts`,
 * `handleGenerateOversightDocument`), para que un oficio salga igual desde los
 * dos clientes. El servidor deja vacíos `pqrDescription` y `city`.
 */
export interface GenerateOversightInput {
  /** El nombre del autor, o «Anónimo» si no llega. */
  fullName: string;
  /** El nombre del ente de control destinatario. */
  oversightEntity: string;
  /** El nombre de la entidad que no respondió. */
  entity: string;
  /** El tipo en español, p. ej. «Queja». */
  pqrType: string;
  /** La fecha de radicación, `AAAA-MM-DD`. */
  pqrDate: string;
  /** Días hábiles desde el vencimiento, los del servidor. */
  daysExceeded: number;
  pqrDescription: string;
  /** Departamento de la entidad, o «No especificado». */
  department: string;
  /** Municipio de la entidad, o vacío. */
  city: string;
}

/** Dónde está la entidad de la PQRSD, con los nombres tal como vienen. */
export interface EntityLocation {
  departmentName: string | null;
  cityName: string | null;
}

/**
 * Los datos del oficio para una PQRSD y un ente de control.
 *
 * El nombre es el del autor aunque la PQRSD sea anónima: el servidor se lo
 * manda a su autor también entonces, y la dirección decidió que el oficio va
 * con los datos (el aviso de la confirmación lo dice).
 */
export function buildOversightLetterInput(
  pqr: PQRS,
  oversightEntityName: string,
  location: EntityLocation,
): GenerateOversightInput {
  return {
    fullName: pqr.creator?.name?.trim() || 'Anónimo',
    oversightEntity: oversightEntityName,
    entity: pqr.entity?.name ?? '',
    pqrType: typeMap[pqr.type]?.label ?? pqr.type,
    pqrDate: new Date(pqr.createdAt).toISOString().slice(0, 10),
    daysExceeded: resolveOverdue(pqr).businessDaysExceeded,
    pqrDescription: pqr.description ?? '',
    department: formatPlaceName(location.departmentName || 'No especificado'),
    city: formatPlaceName(location.cityName ?? ''),
  };
}

const LOWERCASE_WORDS = new Set([
  'de', 'y', 'en', 'a', 'con', 'por', 'para', 'el', 'la', 'los', 'las', 'del', 'al',
]);

/**
 * Nombre de lugar en tipo título, con las partículas en minúscula:
 * «SANTA MARTA» → «Santa Marta», «NORTE DE SANTANDER» → «Norte de Santander».
 *
 * Porte de `formatText` de la web (`utils/formatText.ts`), que es con lo que
 * la web manda el departamento y la ciudad al redactar: los mismos datos dan
 * el mismo oficio.
 */
export function formatPlaceName(text: string): string {
  if (!text) return '';

  return text
    .toLowerCase()
    .split(' ')
    .map((word, index) =>
      index === 0 || !LOWERCASE_WORDS.has(word)
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word,
    )
    .join(' ');
}

/**
 * Qué decir cuando no se pudo redactar el oficio.
 *
 * El 429 lleva su propio texto: el servidor deja cinco documentos por usuario
 * cada cuarto de hora, y un «inténtalo de nuevo en unos segundos» invitaría a
 * pulsar justo cuando no va a funcionar.
 */
export function describeDraftFailure(error: unknown): { title: string; message: string } {
  const response = (error as { response?: { status?: number; headers?: unknown } })?.response;

  if (response?.status === 429) {
    const seconds = retryAfterSeconds(response.headers);
    let when = 'en unos minutos';
    if (seconds !== null) {
      const minutes = Math.ceil(seconds / 60);
      when = minutes === 1 ? 'en 1 minuto' : `en ${minutes} minutos`;
    }
    return {
      title: 'Espera antes de volver a intentarlo',
      message:
        'Hay un límite de documentos que puedes redactar en poco tiempo y ya lo alcanzaste. ' +
        `Podrás volver a intentarlo ${when}. No redactamos nada en este intento.`,
    };
  }

  if (response?.status === 401) {
    return {
      title: 'Sesión caducada',
      message: 'Tu sesión caducó. Vuelve a iniciar sesión e inténtalo de nuevo.',
    };
  }

  return {
    title: 'No se pudo redactar',
    message: 'Ocurrió un error redactando el oficio. Intenta de nuevo en unos segundos.',
  };
}

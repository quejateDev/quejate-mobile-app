/**
 * Aviso de conservación de los documentos legales.
 *
 * El plazo lo decidió la dirección con un abogado y los términos de la web se
 * actualizan en el mismo sentido, así que esto no es texto de relleno: si el
 * plazo cambia, cambia aquí y en los términos, no solo en una pantalla.
 *
 * PENDIENTE: redacción por acordar con el responsable. Está en un único sitio
 * precisamente para que ese cambio sea de una línea.
 */
export const LEGAL_DOC_RETENTION_NOTICE =
  'Guardamos este documento seis meses para que puedas volver a descargarlo. Después se borra.';

/**
 * El oficio lleva el nombre de quien lo envía, y el correo al ente de control
 * su nombre, su correo y su teléfono (los pone el servidor). Decisión de la
 * dirección del 14/10/2026: se mantienen, para que el ente pueda responder y
 * actuar, pero se avisa en la confirmación, antes de enviar.
 *
 * Mismo texto que la web (`constants/legalDocsCopy.ts` en `quejate-app`).
 */
export const OVERSIGHT_SEND_IDENTITY_NOTICE =
  'Al enviar el oficio, el ente de control recibirá tu nombre y tus datos de contacto, para que pueda responderte y actuar frente a la entidad que no respondió tu solicitud.';

/**
 * Lo mismo cuando la PQRSD es anónima: lo es ante la entidad, no ante el ente
 * de control. Va antes del aviso anterior, y solo en una PQRSD anónima.
 */
export const OVERSIGHT_SEND_ANONYMOUS_NOTICE =
  'Tu PQRSD es anónima ante la entidad, pero el oficio no lo es.';

/**
 * El servidor no pudo guardar el oficio (el guardado es best effort): el texto
 * está en pantalla, pero no hay PDF ni envío, porque los dos salen del
 * documento guardado. Se dice, en vez de dejar botones que no harían nada.
 */
export const OVERSIGHT_NOT_SAVED_NOTICE =
  'No pudimos guardar este oficio, así que no hay PDF ni podemos enviarlo por correo al ente de control: los dos salen del documento guardado. Cópialo antes de salir de esta pantalla; si lo necesitas en PDF o quieres enviarlo, vuelve a redactarlo más tarde.';

/**
 * Fecha absoluta y corta para documentos legales. Aquí no sirve un «hace 3
 * meses»: el ciudadano necesita saber el día exacto hasta el que puede
 * descargar el documento.
 */
export function formatLegalDocDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

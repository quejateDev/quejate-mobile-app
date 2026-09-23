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

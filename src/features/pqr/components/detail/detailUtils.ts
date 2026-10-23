export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'wmv', 'flv', 'mkv', 'webm', 'm4v', '3gp'];

export function isImageAttachment(mimeType?: string | null, name?: string | null): boolean {
  if (mimeType && mimeType.startsWith('image/')) return true;
  const ext = (name ?? '').split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.includes(ext);
}

export function isVideoAttachment(mimeType?: string | null, name?: string | null): boolean {
  if (mimeType && mimeType.startsWith('video/')) return true;
  const ext = (name ?? '').split('.').pop()?.toLowerCase() ?? '';
  return VIDEO_EXTENSIONS.includes(ext);
}

export function isMediaAttachment(mimeType?: string | null, name?: string | null): boolean {
  return isImageAttachment(mimeType, name) || isVideoAttachment(mimeType, name);
}

const COLOMBIA_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * Fecha y hora de Colombia como las pinta la web (`formatDate` de
 * `lib/dateUtils.ts`): «23/10/2026, 02:30:00 p. m.». Colombia está en UTC-5
 * todo el año, así que no depende de la zona del teléfono ni del Intl de
 * Hermes. Si la fecha no se puede leer, devuelve `null`.
 */
export function formatColombiaDateTime(date: Date | string): string | null {
  const ts = new Date(date).getTime();
  if (!Number.isFinite(ts)) return null;
  const co = new Date(ts - COLOMBIA_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, '0');
  const hours = co.getUTCHours();
  const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
  return (
    `${pad(co.getUTCDate())}/${pad(co.getUTCMonth() + 1)}/${co.getUTCFullYear()}, ` +
    `${pad(hours % 12 || 12)}:${pad(co.getUTCMinutes())}:${pad(co.getUTCSeconds())} ${ampm}`
  );
}

/**
 * Cambia cada guion por el que no parte la línea (U+2011): un radicado como
 * «EXT-2026-004512» pasa entero a la línea siguiente en vez de partirse por un
 * guion. Solo para pintar; el valor que se lee en voz alta lleva los guiones.
 */
export function nonBreakingHyphens(value: string): string {
  return value.replace(/-/g, '\u2011');
}

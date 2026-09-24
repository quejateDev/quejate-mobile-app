import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SecureStorage } from '@core/auth/SecureStorage';
import { notifySessionExpired } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';

/**
 * Base absoluta del API.
 *
 * `FileSystem.downloadAsync` NO pasa por `apiClient`, así que no hereda su
 * `baseURL` ni su interceptor de `Authorization`: la URL se arma entera aquí y
 * la cabecera se pone a mano.
 *
 * Se construye sobre EXPO_PUBLIC_API_URL tal cual. NO se le puede quitar el
 * sufijo con `.replace('/api', '')`: en `https://api.quejate.com.co/api` esa
 * búsqueda casa primero con el `//api` del host y deja una URL rota. Es el
 * mismo motivo por el que `useAuth` dejó de hacerlo.
 *
 * Se lee dentro de la función y no al cargar el módulo: Babel inlinea las
 * `EXPO_PUBLIC_*` en tiempo de build, así que no cuesta nada en el teléfono, y
 * así la función es comprobable sin recargar el módulo entero.
 */
function apiBase(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
}

export type PdfFailure =
  /** 401: el token ya no vale. Se limpia la sesión, igual que hace apiClient. */
  | 'session-expired'
  /** 404: el documento expiró, se borró, o no es de quien lo pide. */
  | 'not-found'
  /** Red caída, disco lleno, o cualquier otro estado inesperado. */
  | 'failed';

export type PdfResult = { ok: true; uri: string } | { ok: false; reason: PdfFailure };

/** Los ids vienen del servidor; se saneen igual antes de usarlos como fichero. */
function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

/**
 * Nombre del fichero según el `Content-Disposition` de la respuesta.
 *
 * El servidor es la fuente autoritativa: tiene un nombre fijo por tipo de
 * documento (`tutela.pdf`, `oficio_ente_control.pdf`, `certificado_pqrsd.pdf`)
 * y la app se adapta, en vez de duplicar aquí una tabla que quedaría vieja en
 * cuanto el backend añada un tipo — y la app no puede parchearse sin tienda.
 *
 * Aun así el nombre se sanea: viene de la red y acaba siendo una ruta.
 */
function filenameFromHeaders(headers: Record<string, string> | undefined): string | null {
  if (!headers) return null;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === 'content-disposition');
  if (!key) return null;

  const match = /filename\s*=\s*"?([^";]+)"?/i.exec(headers[key] ?? '');
  const raw = match?.[1]?.trim();
  if (!raw) return null;

  // Solo el nombre: nada de subir por la ruta con '..' o separadores.
  const base = raw.split(/[\\/]/).pop() ?? '';
  const cleaned = base.replace(/[^a-zA-Z0-9_.-]/g, '-').replace(/^\.+/, '');
  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : null;
}

/**
 * @param path        Ruta del API, relativa a la base.
 * @param slot        Carpeta propia del documento dentro de la caché. Evita que
 *                    dos descargas con el mismo nombre del servidor —dos tutelas
 *                    son las dos `tutela.pdf`— se pisen la una a la otra.
 * @param fallbackName Nombre a usar si la respuesta no trae `Content-Disposition`.
 *                    Nunca nombra un tipo concreto: más vale genérico que mentir.
 */
async function downloadPdf(
  path: string,
  slot: string,
  fallbackName: string,
): Promise<PdfResult> {
  const token = await SecureStorage.getSessionToken();
  if (!token) {
    notifySessionExpired();
    return { ok: false, reason: 'session-expired' };
  }

  const dir = `${FileSystem.cacheDirectory}legal-docs/${safeName(slot)}/`;
  const target = `${dir}descarga.pdf`;

  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

    const { uri, status, headers } = await FileSystem.downloadAsync(
      `${apiBase()}${path}`,
      target,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (status !== 200) {
      // downloadAsync escribe en disco lo que devuelva el servidor, también el
      // cuerpo de un error. Hay que borrarlo o acabaríamos compartiendo un JSON
      // de error con extensión .pdf.
      await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);

      if (status === 401) {
        // Sin interceptor que lo haga, se replica aquí lo que hace apiClient.
        await SecureStorage.removeSessionToken();
        notifySessionExpired();
        return { ok: false, reason: 'session-expired' };
      }
      if (status === 404) return { ok: false, reason: 'not-found' };
      return { ok: false, reason: 'failed' };
    }

    // El nombre definitivo es el que ve quien recibe el PDF por correo o
    // WhatsApp, así que se renombra después de descargar, cuando ya se conoce.
    const finalUri = `${dir}${filenameFromHeaders(headers) ?? fallbackName}`;
    if (finalUri !== uri) {
      try {
        await FileSystem.deleteAsync(finalUri, { idempotent: true });
        await FileSystem.moveAsync({ from: uri, to: finalUri });
      } catch {
        // Si el renombrado falla, el PDF descargado sigue siendo válido: se
        // comparte con el nombre provisional antes que no compartir nada.
        return { ok: true, uri };
      }
    }

    return { ok: true, uri: finalUri };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/**
 * PDF de un documento legal guardado. Necesita el id que devuelve la generación.
 *
 * El nombre lo pone el servidor: una tutela baja como `tutela.pdf` y un oficio
 * a un ente de control como `oficio_ente_control.pdf`. La app no los distingue
 * ni falta que le hace.
 */
export function downloadLegalDocPdf(id: string): Promise<PdfResult> {
  return downloadPdf(ENDPOINTS.LEGAL_DOCS.PDF(id), `doc-${id}`, 'documento.pdf');
}

/**
 * Certificado de radicación de una PQRSD. El backend responde 404 a quien no
 * sea el autor, igual que si la PQRSD no existiera, así que un 'not-found' aquí
 * no distingue «no es tuya» de «no existe» — y no debe intentar distinguirlo.
 */
export function downloadCertificatePdf(pqrId: string): Promise<PdfResult> {
  return downloadPdf(
    ENDPOINTS.PQR.CERTIFICATE(pqrId),
    `certificado-${pqrId}`,
    'certificado.pdf',
  );
}

/**
 * Abre el diálogo del sistema para el PDF ya descargado. Devuelve false si el
 * teléfono no ofrece compartir, para que la pantalla pueda decirlo.
 */
export async function sharePdf(uri: string, dialogTitle: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle,
  });
  return true;
}

/** Mensaje para el ciudadano de cada motivo de fallo. */
export function pdfFailureMessage(reason: PdfFailure): string {
  switch (reason) {
    case 'session-expired':
      return 'Tu sesión caducó. Vuelve a iniciar sesión e inténtalo de nuevo.';
    case 'not-found':
      return 'Este documento ya no está disponible.';
    default:
      return 'No se pudo descargar el PDF. Revisa tu conexión e inténtalo de nuevo.';
  }
}

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

async function downloadPdf(path: string, fileName: string): Promise<PdfResult> {
  const token = await SecureStorage.getSessionToken();
  if (!token) {
    notifySessionExpired();
    return { ok: false, reason: 'session-expired' };
  }

  const target = `${FileSystem.cacheDirectory}${fileName}`;

  try {
    const { uri, status } = await FileSystem.downloadAsync(`${apiBase()}${path}`, target, {
      headers: { Authorization: `Bearer ${token}` },
    });

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

    return { ok: true, uri };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/** PDF de un documento legal guardado. Necesita el id que devuelve la generación. */
export function downloadLegalDocPdf(id: string): Promise<PdfResult> {
  return downloadPdf(ENDPOINTS.LEGAL_DOCS.PDF(id), `tutela-${safeName(id)}.pdf`);
}

/**
 * Certificado de radicación de una PQRSD. El backend responde 404 a quien no
 * sea el autor, igual que si la PQRSD no existiera, así que un 'not-found' aquí
 * no distingue «no es tuya» de «no existe» — y no debe intentar distinguirlo.
 */
export function downloadCertificatePdf(pqrId: string): Promise<PdfResult> {
  return downloadPdf(
    ENDPOINTS.PQR.CERTIFICATE(pqrId),
    `certificado-${safeName(pqrId)}.pdf`,
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

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { pdfFailureMessage, sharePdf } from '@features/pqr/utils/legalDocShare';
import type { PdfResult } from '@features/pqr/utils/legalDocShare';

/**
 * Descarga un PDF y se lo pasa al diálogo del sistema, con el aviso adecuado
 * cuando falla. Lo comparten la pantalla de generar, la de un documento
 * guardado y el menú de la PQRSD, para que los tres traten igual la sesión
 * caducada y el documento que ya no está.
 *
 * `busy` lleva la clave de la acción en curso para que cada botón pueda pintar
 * su propio spinner sin bloquear a los demás por separado.
 */
export function usePdfDownload() {
  const [busy, setBusy] = useState<string | null>(null);

  const run = useCallback(
    async (key: string, download: () => Promise<PdfResult>, dialogTitle: string) => {
      // Una descarga a la vez: dos diálogos del sistema a la vez no aportan nada.
      if (busy !== null) return;
      setBusy(key);
      try {
        const res = await download();
        if (!res.ok) {
          Alert.alert('No se pudo obtener el PDF', pdfFailureMessage(res.reason));
          return;
        }
        const shared = await sharePdf(res.uri, dialogTitle);
        if (!shared) {
          Alert.alert(
            'No disponible',
            'Este teléfono no permite abrir ni compartir archivos.',
          );
        }
      } finally {
        setBusy(null);
      }
    },
    [busy],
  );

  return { busy, run };
}

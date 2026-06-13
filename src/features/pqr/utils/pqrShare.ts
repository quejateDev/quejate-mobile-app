import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { PQRS, Attachment } from '@core/types';
import { isImageAttachment } from '@features/pqr/components/detail/detailUtils';

const WEB_BASE_URL = 'https://www.quejate.com.co';

/**
 * URL pública de la PQRSD. El web aún debe exponer la ruta /pqr/:id con OpenGraph
 * tags para que WhatsApp/Facebook generen el preview rich ("viene de Quéjate").
 * Hasta entonces el link viaja en el texto pero no genera preview.
 */
export function buildShareUrl(id: string): string {
  return `${WEB_BASE_URL}/pqr/${id}`;
}

export function buildShareText(pqr: Pick<PQRS, 'id' | 'subject' | 'description'>): string {
  const subject = pqr.subject ?? 'PQRSD';
  const url = buildShareUrl(pqr.id);
  const lines = [subject];
  if (pqr.description) lines.push('', pqr.description);
  lines.push('', `Míralo en Quéjate: ${url}`);
  return lines.join('\n');
}

/** Descarga la primera imagen adjunta a cache y devuelve su uri local (o null). */
export async function downloadFirstImage(
  pqr: Pick<PQRS, 'id' | 'attachments'>,
): Promise<string | null> {
  const firstImage: Attachment | undefined = (pqr.attachments ?? []).find((a: Attachment) =>
    isImageAttachment(a.type, a.name),
  );
  if (!firstImage) return null;
  try {
    const rawExt = (firstImage.name?.split('.').pop() || 'jpg').toLowerCase();
    const ext = rawExt.replace(/[^a-z0-9]/g, '') || 'jpg';
    const localUri = `${FileSystem.cacheDirectory}share-src-${pqr.id}.${ext}`;
    const { uri } = await FileSystem.downloadAsync(firstImage.url, localUri);
    return uri;
  } catch {
    return null;
  }
}

/**
 * Comparte una imagen (la tarjeta branded ya capturada, o un adjunto) por el sheet
 * nativo. expo-sharing no acepta texto, así que el link/caption no viaja aquí; para
 * eso está shareLink().
 */
export async function shareImage(uri: string, dialogTitle: string): Promise<boolean> {
  const available = await Sharing.isAvailableAsync();
  if (!available) return false;
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    dialogTitle,
  });
  return true;
}

/** Comparte asunto + descripción + link OG como texto. */
export async function shareLink(
  pqr: Pick<PQRS, 'id' | 'subject' | 'description'>,
): Promise<void> {
  await Share.share({
    title: pqr.subject ?? 'PQRSD',
    message: buildShareText(pqr),
  });
}

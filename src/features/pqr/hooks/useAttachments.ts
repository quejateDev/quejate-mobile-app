import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { LocalAttachment } from '@features/pqr/hooks/useCreatePQR';

export function useAttachments() {
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setAttachments((prev) => [
      ...prev,
      {
        uri: asset.uri,
        name: asset.fileName ?? `imagen_${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize ?? 0,
      },
    ]);
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'video/*'],
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setAttachments((prev) => [
      ...prev,
      {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? 'application/octet-stream',
        size: asset.size ?? 0,
      },
    ]);
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  return { attachments, pickImage, pickDocument, removeAttachment };
}

import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { LocalAttachment } from '@features/pqr/hooks/useCreatePQR';

export function useAttachments() {
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);

  function append(att: LocalAttachment) {
    setAttachments((prev) =>
      prev.some((a) => a.uri === att.uri) ? prev : [...prev, att],
    );
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    append({
      uri: asset.uri,
      name: asset.fileName ?? `imagen_${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize ?? 0,
    });
  }

  // Captura en el acto con la cámara: foto o grabación de video en el momento de
  // radicar la PQRSD (no desde galería). Permiso de cámara solicitado al vuelo.
  async function captureWithCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permiso de cámara',
        'Habilita el acceso a la cámara en los ajustes para capturar foto o video.',
      );
      return;
    }
    Alert.alert('Cámara', '¿Qué deseas capturar?', [
      { text: 'Tomar foto', onPress: () => launchCamera('images') },
      { text: 'Grabar video', onPress: () => launchCamera('videos') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function launchCamera(kind: 'images' | 'videos') {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: [kind],
      quality: 0.8,
      videoMaxDuration: 60,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    const isVideo = kind === 'videos';
    append({
      uri: asset.uri,
      name: asset.fileName ?? `captura_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
      type: asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
      size: asset.fileSize ?? 0,
    });
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'video/*'],
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    append({
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? 'application/octet-stream',
      size: asset.size ?? 0,
    });
  }

  /** Pre-adjunta un archivo ya construido (p. ej. el audio del sonómetro). */
  function addAttachment(att: LocalAttachment) {
    append(att);
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  return {
    attachments,
    pickImage,
    captureWithCamera,
    pickDocument,
    addAttachment,
    removeAttachment,
  };
}

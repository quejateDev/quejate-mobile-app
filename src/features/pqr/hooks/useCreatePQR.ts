import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { uploadToS3 } from '@shared/utils/s3Upload';
import { debugLog } from '@core/debug/debugStore';
import type { PQRS, PQRSType } from '@core/types';

export interface LocalAttachment {
  uri: string;
  name: string;
  type: string;
  size: number;
}

interface CustomFieldEntry {
  name: string;
  value: string;
  type: string;
  placeholder: string;
  required: boolean;
}

export interface CreatePQRInput {
  type: PQRSType;
  entityId: string;
  departmentId?: string;
  subject?: string;
  description?: string;
  isAnonymous: boolean;
  isPrivate: boolean;
  includePhone?: boolean;
  creatorId?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  latitude?: number | null;
  longitude?: number | null;
  customFields: CustomFieldEntry[];
  localAttachments: LocalAttachment[];
  recaptchaToken: string;
}

interface UploadedAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
  thumbnailUrl?: string;
}

/**
 * Para videos, el backend espera que el teléfono genere y suba el poster (primer frame)
 * y lo envíe como `thumbnailUrl`. Si la generación falla, se sube el video sin poster
 * y la UI cae al ícono de play.
 */
async function uploadAttachment(file: LocalAttachment): Promise<UploadedAttachment> {
  const url = await uploadToS3(file.uri, file.type);
  const base: UploadedAttachment = { name: file.name, url, type: file.type, size: file.size };

  if (!file.type.startsWith('video/')) return base;

  try {
    const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(file.uri, {
      time: 1000,
      quality: 0.7,
    });
    const thumbnailUrl = await uploadToS3(thumbUri, 'image/jpeg');
    return { ...base, thumbnailUrl };
  } catch (error) {
    debugLog('err', `THUMB gen/upload fail (${file.name}): ${String(error)}`);
    return base;
  }
}

async function submitPQR(input: CreatePQRInput): Promise<PQRS> {
  const { localAttachments, ...rest } = input;

  const uploadedAttachments = await Promise.all(localAttachments.map(uploadAttachment));

  const payload = {
    ...rest,
    attachments: uploadedAttachments,
  };

  const formData = new FormData();
  formData.append('data', JSON.stringify(payload));

  const res = await apiClient.post<PQRS>(ENDPOINTS.PQR.CREATE, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export function useCreatePQR(userId?: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<PQRS, unknown, CreatePQRInput>({
    mutationFn: submitPQR,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pqrs'] });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['pqrs-by-user', userId] });
      }
    },
  });

  return {
    createPQR: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

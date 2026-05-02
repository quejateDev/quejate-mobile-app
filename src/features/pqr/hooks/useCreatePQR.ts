import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { uploadToS3 } from '@shared/utils/s3Upload';
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

async function submitPQR(input: CreatePQRInput): Promise<PQRS> {
  const { localAttachments, ...rest } = input;

  const uploadedAttachments = await Promise.all(
    localAttachments.map(async (file) => {
      const s3Url = await uploadToS3(file.uri, file.type);
      return { name: file.name, url: s3Url, type: file.type, size: file.size };
    }),
  );

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

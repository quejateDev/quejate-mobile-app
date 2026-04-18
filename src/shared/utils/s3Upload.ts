import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';

interface PresignedResponse {
  url: string;
  key: string;
  bucket: string;
}

export async function uploadToS3(
  uri: string,
  contentType: string,
  folder = 'uploads',
): Promise<string> {
  const filename = uri.split('/').pop() ?? `file_${Date.now()}`;

  const presignedRes = await apiClient.post<PresignedResponse>(
    ENDPOINTS.UPLOAD.PRESIGNED,
    { filename, contentType, folder },
  );

  const { url, key } = presignedRes.data;

  const fileRes = await fetch(uri);
  const blob = await fileRes.blob();

  await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });

  return `${new URL(url).origin}/${key}`;
}

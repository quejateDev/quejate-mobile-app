import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreatePQR } from '../useCreatePQR';
import type { CreatePQRInput } from '../useCreatePQR';
import { apiClient } from '@core/api/client';
import { uploadToS3 } from '@shared/utils/s3Upload';
import { ENDPOINTS } from '@core/api/endpoints';

jest.mock('@core/api/client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

jest.mock('@shared/utils/s3Upload', () => ({
  uploadToS3: jest.fn(),
}));

const mockPQRS = {
  id: 'pqr-1',
  consecutiveCode: 'PQR-20240101-001',
  type: 'PETITION',
  status: 'PENDING',
  entityId: 'entity-1',
  anonymous: false,
  private: false,
  dueDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  entity: { id: 'entity-1', name: 'Entidad de prueba' },
  department: null,
  attachments: [],
  comments: [],
  likes: [],
  customFieldValues: [],
};

const baseInput: CreatePQRInput = {
  type: 'PETITION',
  entityId: 'entity-1',
  isAnonymous: false,
  isPrivate: false,
  customFields: [],
  localAttachments: [],
  recaptchaToken: 'test-token',
};

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    children,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (apiClient.post as jest.Mock).mockResolvedValue({ data: mockPQRS });
  (uploadToS3 as jest.Mock).mockResolvedValue(
    'https://bucket.s3.us-east-1.amazonaws.com/key/file.jpg',
  );
});

describe('useCreatePQR', () => {
  it('sube adjuntos a S3 antes de POST /api/pqr', async () => {
    const callOrder: string[] = [];

    (uploadToS3 as jest.Mock).mockImplementation(async () => {
      callOrder.push('s3Upload');
      return 'https://bucket.s3.us-east-1.amazonaws.com/key/file.jpg';
    });
    (apiClient.post as jest.Mock).mockImplementation(async () => {
      callOrder.push('apiPost');
      return { data: mockPQRS };
    });

    const { result } = renderHook(() => useCreatePQR('user-1'), { wrapper });

    await act(async () => {
      await result.current.createPQR({
        ...baseInput,
        localAttachments: [
          { uri: 'file:///local/imagen.jpg', name: 'imagen.jpg', type: 'image/jpeg', size: 1024 },
        ],
      });
    });

    expect(callOrder).toEqual(['s3Upload', 'apiPost']);
  });

  it('construye FormData con campo data como JSON string', async () => {
    const appendSpy = jest.spyOn(FormData.prototype, 'append');

    const input: CreatePQRInput = {
      ...baseInput,
      subject: 'Mi asunto',
      description: 'Mi descripción',
      customFields: [
        { name: 'Número de caso', value: '123', type: 'text', placeholder: '', required: true },
      ],
    };

    const { result } = renderHook(() => useCreatePQR('user-1'), { wrapper });

    await act(async () => {
      await result.current.createPQR(input);
    });

    const dataCall = appendSpy.mock.calls.find(([key]) => key === 'data');
    expect(dataCall).toBeDefined();

    const dataValue = dataCall![1] as unknown as string;
    expect(typeof dataValue).toBe('string');

    const parsed = JSON.parse(dataValue);
    expect(parsed.type).toBe(input.type);
    expect(parsed.entityId).toBe(input.entityId);
    expect(parsed.subject).toBe(input.subject);
    expect(parsed.attachments).toEqual([]);

    expect(apiClient.post).toHaveBeenCalledWith(
      ENDPOINTS.PQR.CREATE,
      expect.any(FormData),
    );

    appendSpy.mockRestore();
  });

  it('maneja error de S3 y rechaza la mutación', async () => {
    const s3Error = new Error('S3 upload failed');
    (uploadToS3 as jest.Mock).mockRejectedValue(s3Error);

    const { result } = renderHook(() => useCreatePQR('user-1'), { wrapper });

    await act(async () => {
      await expect(
        result.current.createPQR({
          ...baseInput,
          localAttachments: [
            { uri: 'file:///local/imagen.jpg', name: 'imagen.jpg', type: 'image/jpeg', size: 1024 },
          ],
        }),
      ).rejects.toThrow('S3 upload failed');
    });

    expect(apiClient.post).not.toHaveBeenCalled();
  });
});

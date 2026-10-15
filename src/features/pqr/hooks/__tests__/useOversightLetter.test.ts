import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import {
  sendOversightLetter,
  useGenerateOversightLetter,
  useOversightEntities,
} from '../useOversightLetter';
import type { GenerateOversightInput } from '@features/pqr/utils/oversightLetter';

// 🔴 Solo la API simulada: todos los entes del directorio son reales.
jest.mock('@core/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const get = apiClient.get as jest.Mock;
const post = apiClient.post as jest.Mock;

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const personeria = {
  id: 'ov-1',
  name: 'Personería de Santa Marta',
  email: 'contacto@personeria.example',
  phone: null,
  description: null,
  regionalDepartmentId: '47',
  municipalityId: '47.001',
  Municipality: { id: '47.001', name: 'SANTA MARTA' },
  RegionalDepartment: { id: '47', name: 'MAGDALENA' },
};

const input: GenerateOversightInput = {
  fullName: 'Ana Ruiz',
  oversightEntity: 'Personería de Santa Marta',
  entity: 'Alcaldía de Santa Marta',
  pqrType: 'Queja',
  pqrDate: '2026-01-15',
  daysExceeded: 20,
  pqrDescription: 'Llevo tres semanas sin agua.',
  department: 'Magdalena',
  city: 'Santa Marta',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 5 * 60 * 1000 },
      mutations: { retry: false },
    },
  });
});

afterEach(() => {
  queryClient.clear();
  jest.useRealTimers();
});

describe('useOversightEntities', () => {
  it('pide los entes con el departamento y el municipio de la entidad', async () => {
    get.mockImplementation((url: string) =>
      Promise.resolve(
        url === ENDPOINTS.ENTITIES.DETAIL('ent-1')
          ? {
              data: {
                id: 'ent-1',
                regionalDepartmentId: '47',
                municipalityId: '47.001',
                RegionalDepartment: { id: '47', name: 'MAGDALENA' },
                Municipality: { id: '47.001', name: 'SANTA MARTA' },
              },
            }
          : { data: [personeria] },
      ),
    );

    const { result } = renderHook(() => useOversightEntities('ent-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenNthCalledWith(1, '/entities/ent-1');
    expect(get).toHaveBeenNthCalledWith(2, '/oversight-entity/by-location', {
      params: { regionalDepartmentId: '47', municipalityId: '47.001' },
    });
    expect(result.current.data).toEqual({
      kind: 'ok',
      entities: [personeria],
      location: { departmentName: 'MAGDALENA', cityName: 'SANTA MARTA' },
    });
  });

  it('sin municipio pide solo por departamento', async () => {
    get.mockImplementation((url: string) =>
      Promise.resolve(
        url === ENDPOINTS.ENTITIES.DETAIL('ent-1')
          ? { data: { regionalDepartmentId: '47', municipalityId: null, Municipality: null } }
          : { data: [] },
      ),
    );

    const { result } = renderHook(() => useOversightEntities('ent-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenLastCalledWith('/oversight-entity/by-location', {
      params: { regionalDepartmentId: '47' },
    });
    expect(result.current.data).toEqual({
      kind: 'ok',
      entities: [],
      location: { departmentName: null, cityName: null },
    });
  });

  it('una entidad sin departamento no pide entes', async () => {
    get.mockResolvedValue({ data: { id: 'ent-1', regionalDepartmentId: null } });

    const { result } = renderHook(() => useOversightEntities('ent-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ kind: 'no-department' });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('sin entidad no pide nada', () => {
    renderHook(() => useOversightEntities(undefined), { wrapper });
    expect(get).not.toHaveBeenCalled();
  });
});

describe('useGenerateOversightLetter', () => {
  it('redacta en /legal-docs/document con documentType oversight y los datos tal cual', async () => {
    post.mockResolvedValue({ data: { document: '  OFICIO  ', id: 'doc-9' } });

    const { result } = renderHook(() => useGenerateOversightLetter(), { wrapper });

    let letter: unknown;
    await act(async () => {
      letter = await result.current.mutateAsync(input);
    });

    expect(post).toHaveBeenCalledWith(
      '/legal-docs/document',
      { documentType: 'oversight', ...input },
      { timeout: 30000 },
    );
    expect(letter).toEqual({ content: 'OFICIO', id: 'doc-9' });
  });

  it('sin id devuelve el texto con id null', async () => {
    post.mockResolvedValue({ data: { document: 'OFICIO' } });

    const { result } = renderHook(() => useGenerateOversightLetter(), { wrapper });

    let letter: unknown;
    await act(async () => {
      letter = await result.current.mutateAsync(input);
    });

    expect(letter).toEqual({ content: 'OFICIO', id: null });
  });

  it('un oficio guardado refresca «Mis documentos legales»', async () => {
    post.mockResolvedValue({ data: { document: 'OFICIO', id: 'doc-9' } });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useGenerateOversightLetter(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['legal-docs'] });
  });

  it('un texto vacío es un fallo, no un oficio', async () => {
    post.mockResolvedValue({ data: { document: '   ', id: 'doc-9' } });

    const { result } = renderHook(() => useGenerateOversightLetter(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toThrow();
    });
  });

  it('un 429 llega a la pantalla con su estado', async () => {
    const error = Object.assign(new Error('429'), {
      response: { status: 429, headers: { 'retry-after': '600' } },
    });
    post.mockRejectedValue(error);

    const { result } = renderHook(() => useGenerateOversightLetter(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toBe(error);
    });
  });
});

describe('sendOversightLetter', () => {
  const target = { pqrId: 'pqr-1', oversightEntityId: 'ov-1' };

  it('manda solo identificadores a /legal-docs/:id/send', async () => {
    post.mockResolvedValue({
      status: 200,
      data: { oversightEntity: { id: 'ov-1', name: 'X' }, sentAt: 'x', citizenNotified: true },
    });

    await expect(sendOversightLetter('doc-9', target)).resolves.toEqual({
      kind: 'sent',
      citizenNotified: true,
    });
    expect(post).toHaveBeenCalledWith('/legal-docs/doc-9/send', target, { timeout: 45000 });
  });

  it('un error con respuesta se clasifica por su estado y su código', async () => {
    post.mockRejectedValue({
      response: { status: 502, data: { code: 'OVERSIGHT_MAIL_FAILED' }, headers: {} },
    });
    await expect(sendOversightLetter('doc-9', target)).resolves.toEqual({ kind: 'not-sent' });

    post.mockRejectedValue({
      response: { status: 504, data: { code: 'OVERSIGHT_MAIL_TIMEOUT' }, headers: {} },
    });
    await expect(sendOversightLetter('doc-9', target)).resolves.toEqual({ kind: 'unconfirmed' });

    post.mockRejectedValue({
      response: { status: 429, data: {}, headers: { 'retry-after': '1800' } },
    });
    await expect(sendOversightLetter('doc-9', target)).resolves.toEqual({
      kind: 'rate-limited',
      retryAfterSeconds: 1800,
    });
  });

  it('un tiempo agotado sin respuesta no dice que no salió', async () => {
    post.mockRejectedValue(Object.assign(new Error('timeout of 45000ms exceeded'), {
      code: 'ECONNABORTED',
    }));

    await expect(sendOversightLetter('doc-9', target)).resolves.toEqual({ kind: 'unconfirmed' });
  });
});

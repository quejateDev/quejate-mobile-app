import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGenerateTutela } from '../useLegalDocs';
import type { GenerateTutelaInput } from '../useLegalDocs';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';

jest.mock('@core/api/client', () => ({
  apiClient: { post: jest.fn() },
}));

const baseInput: GenerateTutelaInput = {
  fullName: 'Ana Ruiz',
  documentNumber: '1234567890',
  department: 'Magdalena',
  city: 'Santa Marta',
  rightViolated: 'Derecho de petición',
  entity: 'Alcaldía de Santa Marta',
  pqrType: 'Queja',
  pqrDate: '2026-01-15',
  daysExceeded: 20,
  pqrDescription: 'No respondieron en el plazo legal.',
};

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// Temporizadores falsos, como en useOversightLetter.test.ts: con los reales,
// el gc de TanStack deja Jest esperando cinco minutos al acabar.
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

afterEach(() => {
  queryClient.clear();
  jest.useRealTimers();
});

describe('useGenerateTutela', () => {
  it('devuelve el texto y el id cuando el backend guardó el documento', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { tutela: '  ACCIÓN DE TUTELA  ', id: 'doc-1' },
    });

    const { result } = renderHook(() => useGenerateTutela(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(baseInput);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ content: 'ACCIÓN DE TUTELA', id: 'doc-1' });

    const [url, , config] = (apiClient.post as jest.Mock).mock.calls[0];
    expect(url).toBe(ENDPOINTS.LEGAL_DOCS.TUTELA);
    expect(config?.timeout).toBe(30000);
  });

  it('devuelve el texto con id null cuando el guardado falló', async () => {
    // El guardado es best effort: si la base falla, el backend registra el error
    // y devuelve la redacción igual. El ciudadano no puede quedarse sin texto.
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { tutela: 'ACCIÓN DE TUTELA' },
    });

    const { result } = renderHook(() => useGenerateTutela(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(baseInput);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ content: 'ACCIÓN DE TUTELA', id: null });
  });

  it('rechaza el texto de error que el backend manda con HTTP 200 (A-27)', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { tutela: 'Error generando el contenido', id: 'doc-2' },
    });

    const { result } = renderHook(() => useGenerateTutela(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(baseInput)).rejects.toThrow(
        'No se pudo generar la tutela. Intenta de nuevo.',
      );
    });
  });

  it('una tutela guardada refresca «Mis documentos legales»', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { tutela: 'ACCIÓN DE TUTELA', id: 'doc-1' },
    });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useGenerateTutela(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(baseInput);
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['legal-docs'] });
  });

  it('sin id no refresca nada: no se guardó', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { tutela: 'ACCIÓN DE TUTELA' } });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useGenerateTutela(), { wrapper });

    let tutela: unknown;
    await act(async () => {
      tutela = await result.current.mutateAsync(baseInput);
    });

    expect(tutela).toEqual({ content: 'ACCIÓN DE TUTELA', id: null });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('rechaza una respuesta sin texto', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { tutela: '   ', id: 'doc-3' } });

    const { result } = renderHook(() => useGenerateTutela(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(baseInput)).rejects.toThrow();
    });
  });
});

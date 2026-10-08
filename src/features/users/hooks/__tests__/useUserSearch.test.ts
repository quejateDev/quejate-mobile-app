import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserSearch, USER_SEARCH_DEBOUNCE_MS } from '../useUserSearch';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { UserSearchResult } from '@core/types';

jest.mock('@core/api/client', () => ({
  apiClient: { get: jest.fn() },
}));

const get = apiClient.get as jest.Mock;

const ana: UserSearchResult = {
  id: 'user-ana',
  name: 'Ana Ruiz',
  role: 'CLIENT',
  image: null,
  _count: { followers: 3, following: 1, PQRS: 2 },
};

const anabel: UserSearchResult = { id: 'user-anabel', name: 'Anabel Ortiz', role: 'CLIENT' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

/** La caja empieza vacía, como en la pantalla; `type` es cada tecla. */
function renderSearch() {
  const hook = renderHook(({ text }: { text: string }) => useUserSearch(text), {
    wrapper,
    initialProps: { text: '' },
  });
  return { ...hook, type: (text: string) => hook.rerender({ text }) };
}

function advance(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

/** Deja pasar la espera entre teclas. */
function settle() {
  advance(USER_SEARCH_DEBOUNCE_MS);
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  queryClient.clear();
  jest.useRealTimers();
});

describe('useUserSearch', () => {
  it('con menos de 2 caracteres no llama al servidor', () => {
    const { result, type } = renderSearch();

    settle();
    type('a');
    settle();
    // Los espacios no cuentan como letras.
    type(' a ');
    settle();

    expect(get).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
    expect(result.current.results).toEqual([]);
  });

  it('espera a que se deje de escribir y pregunta una sola vez', async () => {
    get.mockResolvedValue({ data: [ana] });
    const { result, type } = renderSearch();

    type('an');
    advance(100);
    type('ana');
    advance(USER_SEARCH_DEBOUNCE_MS - 1);

    expect(get).not.toHaveBeenCalled();
    // Ya hay texto que buscar: se dice que se busca aunque aún no haya salido la petición.
    expect(result.current.status).toBe('searching');

    advance(1);

    await waitFor(() => expect(result.current.status).toBe('results'));
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(
      ENDPOINTS.USERS.SEARCH,
      expect.objectContaining({ params: { q: 'ana' } }),
    );
  });

  it('devuelve los resultados tal como llegan', async () => {
    get.mockResolvedValue({ data: [ana, anabel] });
    const { result, type } = renderSearch();

    type('ana');
    settle();

    await waitFor(() => expect(result.current.status).toBe('results'));
    expect(result.current.results).toEqual([ana, anabel]);
    expect(result.current.error).toBeNull();
  });

  it('avisa cuando llegan tantos como el servidor devuelve como mucho', async () => {
    const five = [1, 2, 3, 4, 5].map((n) => ({ ...anabel, id: `user-${n}` }));
    get.mockResolvedValueOnce({ data: five }).mockResolvedValueOnce({ data: five.slice(0, 4) });
    const { result, type } = renderSearch();

    type('an');
    settle();
    await waitFor(() => expect(result.current.status).toBe('results'));
    expect(result.current.limitReached).toBe(true);

    // Con cuatro están todos a la vista: no hay nada que afinar.
    type('ana');
    settle();
    await waitFor(() => expect(result.current.results).toHaveLength(4));
    expect(result.current.limitReached).toBe(false);
  });

  it('limpia los espacios que el servidor no perdona', async () => {
    get.mockResolvedValue({ data: [ana] });
    const { result, type } = renderSearch();

    type('  ana   ruiz ');
    settle();

    await waitFor(() => expect(result.current.status).toBe('results'));
    expect(get).toHaveBeenCalledWith(
      ENDPOINTS.USERS.SEARCH,
      expect.objectContaining({ params: { q: 'ana ruiz' } }),
    );
  });

  it('distingue no encontrar a nadie de no haber buscado', async () => {
    get.mockResolvedValue({ data: [] });
    const { result, type } = renderSearch();

    type('zzz');
    settle();

    await waitFor(() => expect(result.current.status).toBe('empty'));
    expect(result.current.results).toEqual([]);
  });

  it('una respuesta que no es una lista cuenta como vacía', async () => {
    get.mockResolvedValue({ data: { error: 'inesperado' } });
    const { result, type } = renderSearch();

    type('ana');
    settle();

    await waitFor(() => expect(result.current.status).toBe('empty'));
  });

  it('descarta la respuesta tardía de una búsqueda anterior', async () => {
    const first = deferred<{ data: UserSearchResult[] }>();
    const second = deferred<{ data: UserSearchResult[] }>();
    get.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result, type } = renderSearch();
    type('ana');
    settle();
    expect(get).toHaveBeenCalledTimes(1);

    type('anab');
    settle();
    expect(get).toHaveBeenCalledTimes(2);
    // La petición que ya no interesa se cancela, no se deja correr.
    expect(get.mock.calls[0][1].signal.aborted).toBe(true);
    expect(get.mock.calls[1][1].signal.aborted).toBe(false);

    await act(async () => {
      second.resolve({ data: [anabel] });
    });
    await waitFor(() => expect(result.current.status).toBe('results'));
    expect(result.current.results).toEqual([anabel]);

    // «ana» contesta cuando en la caja ya pone «anab».
    await act(async () => {
      first.resolve({ data: [ana] });
    });
    advance(1000);

    expect(result.current.status).toBe('results');
    expect(result.current.results).toEqual([anabel]);
  });

  it('vacía la lista en el acto al borrar la caja', async () => {
    get.mockResolvedValue({ data: [ana] });
    const { result, type } = renderSearch();
    type('ana');
    settle();
    await waitFor(() => expect(result.current.status).toBe('results'));

    type('');

    expect(result.current.status).toBe('idle');
    expect(result.current.results).toEqual([]);
  });

  it('avisa del error y vuelve a buscar al reintentar', async () => {
    const networkError = new Error('Network Error');
    const second = deferred<{ data: UserSearchResult[] }>();
    get.mockRejectedValueOnce(networkError).mockReturnValueOnce(second.promise);
    const { result, type } = renderSearch();

    type('ana');
    settle();

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe(networkError);
    expect(result.current.results).toEqual([]);

    act(() => {
      result.current.retry();
    });
    // Mientras se reintenta no se deja el error fijo en pantalla.
    await waitFor(() => expect(result.current.status).toBe('searching'));

    await act(async () => {
      second.resolve({ data: [ana] });
    });
    await waitFor(() => expect(result.current.status).toBe('results'));
    expect(result.current.results).toEqual([ana]);
    expect(get).toHaveBeenCalledTimes(2);
  });
});

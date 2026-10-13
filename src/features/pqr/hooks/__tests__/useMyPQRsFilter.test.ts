import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useMyPQRsFilter,
  MY_PQRS_FILTER_MAX_PAGES,
  MY_PQRS_FILTER_MAX_PQRS,
  MY_PQRS_FILTER_PAGE_SIZE,
} from '../useMyPQRsFilter';
import { usePQRDetail } from '../usePQRDetail';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { PQRS, PQRSStatus } from '@core/types';

jest.mock('@core/api/client', () => ({
  apiClient: { get: jest.fn() },
}));

const mockSession: { user: { id: string } | null } = { user: { id: 'user-1' } };
jest.mock('@core/auth/useAuth', () => ({
  useAuth: () => ({ user: mockSession.user, isAuthenticated: !!mockSession.user }),
}));

const get = apiClient.get as jest.Mock;

type PageParams = { page: number; limit: number };
type Request = { params: PageParams };

function pqr(n: number, over: Partial<PQRS> = {}): PQRS {
  const code = String(n).padStart(3, '0');
  return {
    id: `pqr-${code}`,
    type: 'COMPLAINT',
    status: 'PENDING',
    dueDate: new Date('2026-11-01T00:00:00Z'),
    anonymous: false,
    private: false,
    subject: `Solicitud ${code}`,
    description: 'Sin novedad',
    entityId: 'entity-1',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
    entity: { id: 'entity-1', name: 'Alcaldía' },
    department: null,
    creator: { id: 'user-1', name: 'Juan García' },
    attachments: [],
    comments: [],
    likes: [],
    customFieldValues: [],
    ...over,
  };
}

/**
 * Las `size` PQRSD de una persona, de la más reciente a la más antigua, todas
 * pendientes. `special` cambia la que ocupa ese puesto, contando desde 1: la 25
 * cae en la tercera página de las de 10, y la 111 en la tercera de las de 50.
 */
function listOf(size: number, special: Record<number, Partial<PQRS>> = {}): PQRS[] {
  return Array.from({ length: size }, (_, i) => pqr(i + 1, special[i + 1]));
}

/**
 * Lo que contesta `GET /pqr/user/:id` a su dueño: por desplazamiento, con el
 * total de todas las páginas, y 400 si se piden más de 50.
 */
function listPage(list: PQRS[], { page, limit }: PageParams) {
  if (limit > 50) {
    throw Object.assign(new Error('Request failed with status code 400'), {
      response: { status: 400 },
    });
  }
  const start = (page - 1) * limit;
  const hasMore = start + limit < list.length;
  return {
    data: {
      pqrs: list.slice(start, start + limit),
      hasMore,
      nextPage: hasMore ? page + 1 : null,
      totalCount: list.length,
    },
  };
}

function serve(list: PQRS[]) {
  get.mockImplementation(async (_url: string, { params }: Request) => listPage(list, params));
}

/** Las páginas pedidas, en orden. */
function asked(): PageParams[] {
  return get.mock.calls.map(([, config]) => config.params);
}

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

/**
 * La pantalla se abre en «Todas»; `choose` es el estado que queda elegido en la
 * barra, y sin argumento vuelve a «Todas». `loaded` es lo que la pantalla lleva
 * cargado, que solo es la lista entera si `loadedIsWhole`.
 */
function renderFilter(loaded: PQRS[] = [], loadedIsWhole = false) {
  type Props = { status: PQRSStatus | undefined; loaded: PQRS[]; loadedIsWhole: boolean };
  let props: Props = { status: undefined, loaded, loadedIsWhole };
  const hook = renderHook(
    (p: Props) => useMyPQRsFilter(p.status, p.loaded, p.loadedIsWhole),
    { wrapper, initialProps: props },
  );
  const update = (next: Partial<Props>) => {
    props = { ...props, ...next };
    hook.rerender(props);
  };
  return {
    ...hook,
    choose: (status?: PQRSStatus) => update({ status }),
    /** La pantalla baja hasta el final de «Todas» y ya lleva cargada la lista entera. */
    loadRest: (whole: PQRS[]) => update({ loaded: whole, loadedIsWhole: true }),
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  get.mockReset();
  mockSession.user = { id: 'user-1' };
  queryClient = new QueryClient({
    // Los cinco minutos del QueryProvider de la app: con ellos, lo que se
    // vuelve a pedir es porque el hook lo pide.
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
  });
});

afterEach(() => {
  queryClient.clear();
  jest.useRealTimers();
});

describe('useMyPQRsFilter', () => {
  it('con «Todas» no pide nada', () => {
    const list = listOf(30);
    serve(list);
    const { result } = renderFilter(list.slice(0, 10));

    expect(get).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
    expect(result.current.results).toEqual([]);
    expect(result.current.limitReached).toBe(false);
  });

  it('con «Todas», refetch no descarga la lista entera', async () => {
    const list = listOf(30);
    serve(list);
    const { result } = renderFilter(list.slice(0, 10));

    await act(async () => {
      result.current.refetch();
    });

    expect(get).not.toHaveBeenCalled();
  });

  it('sin sesión no pide nada', () => {
    mockSession.user = null;
    serve(listOf(30));
    const { result, choose } = renderFilter();

    choose('RESOLVED');

    expect(get).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('encuentra lo que la pantalla no llevaba cargado', async () => {
    const list = listOf(30, { 25: { status: 'RESOLVED' } });
    serve(list);
    // La pantalla lleva la primera página de 10; la 25 está en la tercera.
    const { result, choose } = renderFilter(list.slice(0, 10));

    choose('RESOLVED');

    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results).toEqual([list[24]]);
    expect(result.current.limitReached).toBe(false);
    // Las 30 caben en una sola petición de 50, a las PQRSD de quien tiene la
    // sesión.
    expect(get).toHaveBeenCalledWith(ENDPOINTS.PQR.BY_USER('user-1'), expect.anything());
    expect(asked()).toEqual([{ page: 1, limit: MY_PQRS_FILTER_PAGE_SIZE }]);
  });

  it('si lo cargado ya es la lista entera, filtra sin pedir nada', async () => {
    const list = listOf(8, { 3: { status: 'RESOLVED' }, 7: { status: 'RESOLVED' } });
    serve(list);
    const { result, choose } = renderFilter(list, true);

    choose('RESOLVED');

    expect(result.current.status).toBe('complete');
    expect(result.current.results).toEqual([list[2], list[6]]);
    expect(result.current.limitReached).toBe(false);

    // Tampoco hay nada que volver a pedir: la lista es la de la pantalla.
    await act(async () => {
      result.current.refetch();
    });

    choose('CLOSED');

    expect(result.current.status).toBe('complete');
    expect(result.current.results).toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });

  it('cuando la pantalla termina de cargar la lista, filtra esa y no la copia que pidió antes', async () => {
    const list = listOf(30, { 25: { status: 'RESOLVED' } });
    serve(list);
    const { result, choose, loadRest } = renderFilter(list.slice(0, 10));
    choose('RESOLVED');
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results).toEqual([list[24]]);

    // En «Todas» baja hasta el final, y para entonces le han resuelto otra.
    choose();
    const fresh = listOf(30, { 18: { status: 'RESOLVED' }, 25: { status: 'RESOLVED' } });
    loadRest(fresh);
    choose('RESOLVED');

    expect(result.current.status).toBe('complete');
    expect(result.current.results).toEqual([fresh[17], fresh[24]]);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('mientras llega la lista entera filtra lo cargado, sin darlo por definitivo', async () => {
    const list = listOf(30, { 3: { status: 'RESOLVED' }, 25: { status: 'RESOLVED' } });
    const answer = deferred();
    get.mockImplementation(async (_url: string, { params }: Request) => {
      await answer.promise;
      return listPage(list, params);
    });
    const { result, choose } = renderFilter(list.slice(0, 10));

    choose('RESOLVED');

    expect(result.current.status).toBe('loading');
    expect(result.current.results).toEqual([list[2]]);

    await act(async () => {
      answer.resolve();
    });
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results).toEqual([list[2], list[24]]);
  });

  it('pide de 50 en 50 hasta que el servidor dice que no hay más', async () => {
    const list = listOf(120, { 111: { status: 'CLOSED' } });
    serve(list);
    const { result, choose } = renderFilter(list.slice(0, 10));

    choose('CLOSED');

    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(asked()).toEqual([
      { page: 1, limit: 50 },
      { page: 2, limit: 50 },
      { page: 3, limit: 50 },
    ]);
    expect(result.current.results).toEqual([list[110]]);
    expect(result.current.limitReached).toBe(false);
  });

  it('no da la lista por leída hasta que llega la última página', async () => {
    const list = listOf(120, { 111: { status: 'CLOSED' } });
    const lastPage = deferred();
    get.mockImplementation(async (_url: string, { params }: Request) => {
      if (params.page === 3) await lastPage.promise;
      return listPage(list, params);
    });
    const { result, choose } = renderFilter(list.slice(0, 10));

    choose('CLOSED');
    await waitFor(() => expect(get).toHaveBeenCalledTimes(3));

    // Dos de las tres páginas ya llegaron y en ninguna hay una cerrada: todavía
    // no se puede decir que no tiene ninguna.
    expect(result.current.status).toBe('loading');
    expect(result.current.results).toEqual([]);

    await act(async () => {
      lastPage.resolve();
    });
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results).toEqual([list[110]]);
  });

  it('se para en el tope y avisa de que la lista seguía', async () => {
    const list = listOf(MY_PQRS_FILTER_MAX_PQRS + 100, {
      500: { status: 'CLOSED' },
      551: { status: 'CLOSED' },
    });
    serve(list);
    const { result, choose } = renderFilter(list.slice(0, 10));

    choose('CLOSED');

    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(get).toHaveBeenCalledTimes(MY_PQRS_FILTER_MAX_PAGES);
    expect(asked()[MY_PQRS_FILTER_MAX_PAGES - 1]).toEqual({ page: 10, limit: 50 });
    expect(result.current.limitReached).toBe(true);
    // La 500 es la última que entra; la 551 queda fuera.
    expect(result.current.results).toEqual([list[499]]);

    // Mientras se vuelve a pedir, el aviso del tope espera a la lista de ahora.
    const again = deferred();
    get.mockImplementation(async (_url: string, { params }: Request) => {
      await again.promise;
      return listPage(list, params);
    });
    act(() => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.status).toBe('loading'));
    expect(result.current.limitReached).toBe(false);

    await act(async () => {
      again.resolve();
    });
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.limitReached).toBe(true);
  });

  it('una lista que acaba justo en el tope no cuenta como recortada', async () => {
    const list = listOf(MY_PQRS_FILTER_MAX_PQRS, { 500: { status: 'CLOSED' } });
    serve(list);
    const { result, choose } = renderFilter(list.slice(0, 10));

    choose('CLOSED');

    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(get).toHaveBeenCalledTimes(MY_PQRS_FILTER_MAX_PAGES);
    expect(result.current.limitReached).toBe(false);
    expect(result.current.results).toEqual([list[499]]);
  });

  it('si falla una página no publica media lista, y al reintentar la trae entera', async () => {
    const list = listOf(120, {
      3: { status: 'RESOLVED' },
      30: { status: 'RESOLVED' },
      111: { status: 'RESOLVED' },
    });
    let failing = true;
    const retried = deferred();
    get.mockImplementation(async (_url: string, { params }: Request) => {
      if (failing) {
        if (params.page === 2) throw new Error('Network Error');
      } else {
        await retried.promise;
      }
      return listPage(list, params);
    });
    const { result, choose } = renderFilter(list.slice(0, 10));

    choose('RESOLVED');

    await waitFor(() => expect(result.current.status).toBe('error'));
    // La primera página llegó, y la PQRSD 30 con ella, pero sin las otras dos
    // no es la lista: solo queda lo que la pantalla ya llevaba cargado.
    expect(result.current.results).toEqual([list[2]]);
    expect(result.current.limitReached).toBe(false);

    failing = false;
    act(() => {
      result.current.refetch();
    });
    // Mientras se reintenta no se deja el error fijo.
    await waitFor(() => expect(result.current.status).toBe('loading'));

    await act(async () => {
      retried.resolve();
    });
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results).toEqual([list[2], list[29], list[110]]);
  });

  it('una respuesta sin lista es un fallo, no una lista vacía', async () => {
    get.mockResolvedValue({ data: { error: 'inesperado' } });
    const { result, choose } = renderFilter();

    choose('RESOLVED');

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.results).toEqual([]);
  });

  it('no repite la PQRSD que vuelve a salir en la página siguiente', async () => {
    const list = listOf(60, { 50: { status: 'RESOLVED' } });
    // La persona radica otra entre la primera página y la segunda: todo se
    // corre un puesto y la última de la primera abre la segunda.
    const grown = [pqr(0, { id: 'pqr-new' }), ...list];
    get.mockImplementation(async (_url: string, { params }: Request) =>
      listPage(params.page === 1 ? list : grown, params),
    );
    const { result, choose } = renderFilter(list.slice(0, 10));

    choose('RESOLVED');

    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results).toEqual([list[49]]);
  });

  it('pasar de un estado a otro no vuelve a pedir la lista; salir de «Todas», sí', async () => {
    const list = listOf(30, { 12: { status: 'IN_PROGRESS' }, 25: { status: 'RESOLVED' } });
    serve(list);
    const { result, choose } = renderFilter(list.slice(0, 10));

    choose('RESOLVED');
    await waitFor(() => expect(result.current.status).toBe('complete'));
    choose('IN_PROGRESS');
    expect(result.current.status).toBe('complete');
    expect(result.current.results).toEqual([list[11]]);
    choose('CLOSED');
    expect(result.current.status).toBe('complete');
    expect(result.current.results).toEqual([]);
    expect(get).toHaveBeenCalledTimes(1);

    // Vuelve a «Todas» y, entre tanto, le resuelven otra.
    choose();
    expect(result.current.status).toBe('idle');
    const fresh = listOf(30, {
      12: { status: 'IN_PROGRESS' },
      18: { status: 'RESOLVED' },
      25: { status: 'RESOLVED' },
    });
    const answer = deferred();
    get.mockImplementation(async (_url: string, { params }: Request) => {
      await answer.promise;
      return listPage(fresh, params);
    });

    choose('RESOLVED');

    // La lista del filtro anterior sirve mientras llega la de ahora, pero no
    // es definitiva.
    expect(result.current.status).toBe('loading');
    expect(result.current.results).toEqual([list[24]]);

    await act(async () => {
      answer.resolve();
    });
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results).toEqual([fresh[17], fresh[24]]);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('refetch es la misma función en cada render', async () => {
    const list = listOf(30, { 25: { status: 'RESOLVED' } });
    serve(list);
    const { result, choose } = renderFilter(list.slice(0, 10));
    const { refetch } = result.current;

    choose('RESOLVED');
    await waitFor(() => expect(result.current.status).toBe('complete'));
    choose('CLOSED');
    choose();

    // La pantalla la usa en un `useFocusEffect`, que corre otra vez cada vez
    // que cambia la función que recibe.
    expect(result.current.refetch).toBe(refetch);
  });

  it.each([
    ['todas las listas por usuario', ['pqrs-by-user']],
    ['las de esta persona', ['pqrs-by-user', 'user-1']],
  ])('se refresca cuando se invalidan %s', async (_what, queryKey) => {
    const list = listOf(30, { 25: { status: 'RESOLVED' } });
    serve(list);
    const { result, choose } = renderFilter(list.slice(0, 10));
    choose('RESOLVED');
    await waitFor(() => expect(result.current.status).toBe('complete'));

    // Lo que hacen un «me gusta», un comentario, un cambio de privacidad o
    // radicar una PQRSD.
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey });
    });

    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('lo que refresca el detalle llega a los resultados', async () => {
    const list = listOf(30, { 25: { status: 'IN_PROGRESS' } });
    serve(list);
    const { result, choose } = renderFilter(list.slice(0, 10));
    choose('IN_PROGRESS');
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results).toEqual([list[24]]);

    // Se abre la PQRSD y el detalle la trae ya resuelta.
    get.mockResolvedValue({ data: { ...list[24], status: 'RESOLVED' } });
    const detail = renderHook(() => usePQRDetail(list[24].id), { wrapper });
    await waitFor(() => expect(detail.result.current.isSuccess).toBe(true));

    // Deja de estar «En Proceso» y pasa a «Resuelto».
    await waitFor(() => expect(result.current.results).toEqual([]));
    choose('RESOLVED');
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe(list[24].id);
    expect(result.current.status).toBe('complete');
    // Sin volver a pedir la lista: una petición de la lista y una del detalle.
    expect(get).toHaveBeenCalledTimes(2);
  });
});

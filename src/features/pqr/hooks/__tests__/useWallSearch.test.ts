import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useWallSearch,
  WALL_SEARCH_MAX_PAGES,
  WALL_SEARCH_MAX_PQRS,
  WALL_SEARCH_PAGE_SIZE,
} from '../useWallSearch';
import { usePQRDetail } from '../usePQRDetail';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { PQRS } from '@core/types';

jest.mock('@core/api/client', () => ({
  apiClient: { get: jest.fn() },
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
 * Un muro de `size` PQRSD, de la más reciente a la más antigua. `special` cambia
 * la que ocupa ese puesto, contando desde 1: la 16 cae en la segunda página de
 * las de 10, y la 111 en la tercera de las de 50.
 */
function wallOf(size: number, special: Record<number, Partial<PQRS>> = {}): PQRS[] {
  return Array.from({ length: size }, (_, i) => pqr(i + 1, special[i + 1]));
}

/** Lo que contesta `GET /pqr`: por desplazamiento, y 400 si se piden más de 50. */
function wallPage(wall: PQRS[], { page, limit }: PageParams) {
  if (limit > 50) {
    throw Object.assign(new Error('Request failed with status code 400'), {
      response: { status: 400 },
    });
  }
  const start = (page - 1) * limit;
  const hasMore = start + limit < wall.length;
  return {
    data: { pqrs: wall.slice(start, start + limit), hasMore, nextPage: hasMore ? page + 1 : null },
  };
}

function serve(wall: PQRS[]) {
  get.mockImplementation(async (_url: string, { params }: Request) => wallPage(wall, params));
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

/** La caja empieza vacía, como en la pantalla; `type` es lo que queda escrito. */
function renderSearch(loaded: PQRS[] = []) {
  const hook = renderHook(({ text }: { text: string }) => useWallSearch(text, loaded), {
    wrapper,
    initialProps: { text: '' },
  });
  return { ...hook, type: (text: string) => hook.rerender({ text }) };
}

beforeEach(() => {
  jest.useFakeTimers();
  get.mockReset();
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

describe('useWallSearch', () => {
  it('sin texto no pide nada', () => {
    serve(wallOf(24));
    const { result, type } = renderSearch();

    // Los espacios no son texto.
    type('   ');

    expect(get).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
    expect(result.current.results).toEqual([]);
    expect(result.current.limitReached).toBe(false);
  });

  it('sin texto, refetch no descarga el muro', () => {
    serve(wallOf(24));
    const { result } = renderSearch();

    act(() => {
      result.current.refetch();
    });

    expect(get).not.toHaveBeenCalled();
  });

  it('encuentra lo que la pantalla no llevaba cargado', async () => {
    const wall = wallOf(24, { 16: { subject: 'Basura acumulada en la esquina' } });
    serve(wall);
    // La pantalla lleva la primera página de 10; la 16 está en la segunda.
    const { result, type } = renderSearch(wall.slice(0, 10));

    type('basura');

    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results).toEqual([wall[15]]);
    expect(result.current.limitReached).toBe(false);
    // Las 24 caben en una sola petición de 50.
    expect(get).toHaveBeenCalledWith(ENDPOINTS.PQR.LIST, expect.anything());
    expect(asked()).toEqual([{ page: 1, limit: WALL_SEARCH_PAGE_SIZE }]);
  });

  it('mientras llega el muro entero busca en lo cargado, sin darlo por definitivo', async () => {
    const wall = wallOf(24, {
      3: { subject: 'Basura en el parque' },
      16: { subject: 'Basura acumulada en la esquina' },
    });
    const answer = deferred();
    get.mockImplementation(async (_url: string, { params }: Request) => {
      await answer.promise;
      return wallPage(wall, params);
    });
    const { result, type } = renderSearch(wall.slice(0, 10));

    type('basura');

    expect(result.current.status).toBe('searching');
    expect(result.current.results).toEqual([wall[2]]);

    await act(async () => {
      answer.resolve();
    });
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results).toEqual([wall[2], wall[15]]);
  });

  it('pide de 50 en 50 hasta que el servidor dice que no hay más', async () => {
    const wall = wallOf(120, { 111: { subject: 'Hueco en la vía' } });
    serve(wall);
    const { result, type } = renderSearch(wall.slice(0, 10));

    type('hueco');

    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(asked()).toEqual([
      { page: 1, limit: 50 },
      { page: 2, limit: 50 },
      { page: 3, limit: 50 },
    ]);
    expect(result.current.results).toEqual([wall[110]]);
    expect(result.current.limitReached).toBe(false);
  });

  it('no da el muro por leído hasta que llega la última página', async () => {
    const wall = wallOf(120, { 111: { subject: 'Hueco en la vía' } });
    const lastPage = deferred();
    get.mockImplementation(async (_url: string, { params }: Request) => {
      if (params.page === 3) await lastPage.promise;
      return wallPage(wall, params);
    });
    const { result, type } = renderSearch(wall.slice(0, 10));

    type('hueco');
    await waitFor(() => expect(get).toHaveBeenCalledTimes(3));

    // Dos de las tres páginas ya llegaron y en ninguna hay «hueco»: todavía no
    // se puede decir que no existe.
    expect(result.current.status).toBe('searching');

    await act(async () => {
      lastPage.resolve();
    });
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results).toEqual([wall[110]]);
  });

  it('se para en el tope y avisa de que el muro seguía', async () => {
    const wall = wallOf(WALL_SEARCH_MAX_PQRS + 100, {
      500: { subject: 'Hueco en la vía' },
      551: { subject: 'Hueco frente al colegio' },
    });
    serve(wall);
    const { result, type } = renderSearch(wall.slice(0, 10));

    type('hueco');

    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(get).toHaveBeenCalledTimes(WALL_SEARCH_MAX_PAGES);
    expect(asked()[WALL_SEARCH_MAX_PAGES - 1]).toEqual({ page: 10, limit: 50 });
    expect(result.current.limitReached).toBe(true);
    // La 500 es la última que entra; la 551 queda fuera.
    expect(result.current.results).toEqual([wall[499]]);
  });

  it('un muro que acaba justo en el tope no cuenta como recortado', async () => {
    const wall = wallOf(WALL_SEARCH_MAX_PQRS, { 500: { subject: 'Hueco en la vía' } });
    serve(wall);
    const { result, type } = renderSearch(wall.slice(0, 10));

    type('hueco');

    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(get).toHaveBeenCalledTimes(WALL_SEARCH_MAX_PAGES);
    expect(result.current.limitReached).toBe(false);
    expect(result.current.results).toEqual([wall[499]]);
  });

  it('si falla una página no publica media lista, y al reintentar la trae entera', async () => {
    const wall = wallOf(120, {
      3: { subject: 'Hueco en el parque' },
      30: { subject: 'Hueco en la vía' },
      111: { subject: 'Hueco frente al colegio' },
    });
    let failing = true;
    const retried = deferred();
    get.mockImplementation(async (_url: string, { params }: Request) => {
      if (failing) {
        if (params.page === 2) throw new Error('Network Error');
      } else {
        await retried.promise;
      }
      return wallPage(wall, params);
    });
    const { result, type } = renderSearch(wall.slice(0, 10));

    type('hueco');

    await waitFor(() => expect(result.current.status).toBe('error'));
    // La primera página llegó, y la PQRSD 30 con ella, pero sin las otras dos
    // no es el muro: solo queda lo que la pantalla ya llevaba cargado.
    expect(result.current.results).toEqual([wall[2]]);
    expect(result.current.limitReached).toBe(false);

    failing = false;
    act(() => {
      result.current.refetch();
    });
    // Mientras se reintenta no se deja el error fijo.
    await waitFor(() => expect(result.current.status).toBe('searching'));

    await act(async () => {
      retried.resolve();
    });
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results).toEqual([wall[2], wall[29], wall[110]]);
  });

  it('una respuesta sin lista es un fallo, no un muro vacío', async () => {
    get.mockResolvedValue({ data: { error: 'inesperado' } });
    const { result, type } = renderSearch();

    type('basura');

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.results).toEqual([]);
  });

  it('no repite la PQRSD que vuelve a salir en la página siguiente', async () => {
    const wall = wallOf(60, { 50: { subject: 'Hueco en la vía' } });
    // Alguien radica entre la primera página y la segunda: todo se corre un
    // puesto y la última de la primera abre la segunda.
    const grown = [pqr(0, { id: 'pqr-new' }), ...wall];
    get.mockImplementation(async (_url: string, { params }: Request) =>
      wallPage(params.page === 1 ? wall : grown, params),
    );
    const { result, type } = renderSearch(wall.slice(0, 10));

    type('hueco');

    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results).toEqual([wall[49]]);
  });

  it('encuentra sin tildes y sin mayúsculas, en el asunto, la descripción y la entidad', async () => {
    const wall = wallOf(24, {
      12: { subject: 'Basúra acumulada' },
      16: { description: 'NO RECOGEN LA BASURA' },
      20: { entity: { id: 'entity-2', name: 'Aseo y Basúras S.A.' } },
    });
    serve(wall);
    const { result, type } = renderSearch(wall.slice(0, 10));
    const found = [wall[11], wall[15], wall[19]];

    type('basura');
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results).toEqual(found);

    for (const text of ['BASURA', 'Basúra', '  basura ']) {
      type(text);
      expect(result.current.results).toEqual(found);
    }
  });

  it('con ñ en lo escrito no encuentra la PQRSD que solo dice «ciudadano»', async () => {
    const wall = wallOf(24, {
      14: { subject: 'Daño en la tubería' },
      18: { subject: 'Queja de un ciudadano' },
    });
    serve(wall);
    const { result, type } = renderSearch(wall.slice(0, 10));

    type('daño');
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results).toEqual([wall[13]]);

    // Sin la ñ, la «n» vale por las dos.
    type('dano');
    expect(result.current.results).toEqual([wall[13], wall[17]]);
  });

  it('prepara el texto de cada PQRSD una vez por lista, no en cada tecla', async () => {
    const wall = wallOf(24, { 16: { subject: 'Basura acumulada en la esquina' } });
    serve(wall);
    const { result, type } = renderSearch(wall.slice(0, 10));
    type('b');
    await waitFor(() => expect(result.current.status).toBe('complete'));

    const normalize = jest.spyOn(String.prototype, 'normalize');
    type('ba');
    type('bas');
    type('basura');
    const calls = normalize.mock.calls.length;
    normalize.mockRestore();

    // Tres teclas normalizan lo escrito, no los tres campos de las 24 PQRSD.
    expect(calls).toBeLessThan(wall.length);
    expect(result.current.results).toEqual([wall[15]]);
  });

  it('no encuentra una PQRSD por quien la radicó', async () => {
    const wall = wallOf(24, {
      16: {
        subject: 'Basura acumulada en la esquina',
        anonymous: true,
        // Tal como le llega a su propio autor: con el nombre puesto.
        creator: { id: 'user-9', name: 'Zoraida Pertuz' },
        creatorId: 'user-9',
        guestName: 'Zoraida Pertuz',
      },
    });
    serve(wall);
    const { result, type } = renderSearch(wall.slice(0, 10));

    type('zoraida');
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results).toEqual([]);

    // Tampoco las que no son anónimas: «Juan García» firma todas las demás.
    type('garcia');
    expect(result.current.results).toEqual([]);

    type('basura');
    expect(result.current.results).toEqual([wall[15]]);
  });

  it('vuelve a pedir el muro cada vez que se empieza a buscar, no en cada tecla', async () => {
    const wall = wallOf(24, { 16: { subject: 'Basura acumulada en la esquina' } });
    serve(wall);
    const { result, type } = renderSearch(wall.slice(0, 10));

    type('b');
    await waitFor(() => expect(result.current.status).toBe('complete'));
    type('ba');
    type('basura');
    expect(result.current.status).toBe('complete');
    expect(get).toHaveBeenCalledTimes(1);

    // Se borra la caja y, entre tanto, alguien radica otra.
    type('');
    expect(result.current.status).toBe('idle');
    const fresh = pqr(0, { id: 'pqr-new', subject: 'Basura frente al colegio' });
    const answer = deferred();
    get.mockImplementation(async (_url: string, { params }: Request) => {
      await answer.promise;
      return wallPage([fresh, ...wall], params);
    });

    type('basura');

    // El muro de la búsqueda anterior sirve mientras llega el de ahora, pero
    // no es definitivo.
    expect(result.current.status).toBe('searching');
    expect(result.current.results).toEqual([wall[15]]);

    await act(async () => {
      answer.resolve();
    });
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results).toEqual([fresh, wall[15]]);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('se refresca con lo que invalida las listas del muro', async () => {
    const wall = wallOf(24, { 16: { subject: 'Basura acumulada en la esquina' } });
    serve(wall);
    const { result, type } = renderSearch(wall.slice(0, 10));
    type('basura');
    await waitFor(() => expect(result.current.status).toBe('complete'));

    // Lo que hacen un «me gusta», un comentario o radicar una PQRSD.
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['pqrs'] });
    });

    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('lo que refresca el detalle llega a los resultados', async () => {
    const wall = wallOf(24, { 16: { subject: 'Basura acumulada en la esquina' } });
    serve(wall);
    const { result, type } = renderSearch(wall.slice(0, 10));
    type('basura');
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.results[0].status).toBe('PENDING');

    // Se abre la PQRSD y el detalle la trae ya resuelta.
    get.mockResolvedValue({ data: { ...wall[15], status: 'RESOLVED' } });
    const detail = renderHook(() => usePQRDetail(wall[15].id), { wrapper });
    await waitFor(() => expect(detail.result.current.isSuccess).toBe(true));

    await waitFor(() => expect(result.current.results[0].status).toBe('RESOLVED'));
    expect(result.current.results).toHaveLength(1);
    expect(result.current.status).toBe('complete');
    // Sin volver a pedir el muro: una petición del muro y una del detalle.
    expect(get).toHaveBeenCalledTimes(2);
  });
});

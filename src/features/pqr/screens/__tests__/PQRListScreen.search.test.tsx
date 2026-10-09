import React from 'react';
import { FlatList } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PQRListScreen from '../PQRListScreen';
import { apiClient } from '@core/api/client';
import type { PQRS } from '@core/types';

// Aquí los hooks son los de verdad: lo simulado es la API.
jest.mock('@core/api/client', () => ({ apiClient: { get: jest.fn() } }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@features/notifications/hooks/useNotifications', () => ({
  useNotifications: () => ({ data: [] }),
}));

// De cada tarjeta basta el asunto para saber qué PQRSD hay en la lista.
jest.mock('@features/pqr/components/PQRCard', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Card = ({ pqr }: { pqr: { subject?: string } }) =>
    React.createElement(Text, null, pqr.subject);
  return { __esModule: true, default: Card };
});

const get = apiClient.get as jest.Mock;

const SEARCH_BOX = 'Buscar PQRSD...';
const SEARCHING = 'Buscando en todo el muro…';
const NO_RESULTS = 'Sin resultados para tu búsqueda';
const FAILED = 'No se pudo buscar en todo el muro.';
const LIMIT_REACHED = 'Buscando en las 500 más recientes';

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
 * las de 10, que es la que el muro no trae al abrirse.
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

/** Como `serve`, pero el muro entero (las páginas de 50) no contesta hasta que se suelta. */
function serveHoldingWholeWall(wall: PQRS[]) {
  const wholeWall = deferred();
  get.mockImplementation(async (_url: string, { params }: Request) => {
    if (params.limit === 50) await wholeWall.promise;
    return wallPage(wall, params);
  });
  return wholeWall;
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

/** Abre el muro y espera a su primera página, la única que pide al abrirse. */
async function openWall() {
  const screen = render(
    <QueryClientProvider client={queryClient}>
      <PQRListScreen />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText('Solicitud 001')).toBeTruthy());

  const list = () => screen.UNSAFE_getByType(FlatList);
  return {
    ...screen,
    type: (text: string) => fireEvent.changeText(screen.getByPlaceholderText(SEARCH_BOX), text),
    reachEnd: () =>
      act(() => {
        list().props.onEndReached();
      }),
    pullToRefresh: () =>
      act(() => {
        list().props.refreshControl.props.onRefresh();
      }),
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  get.mockReset();
  queryClient = new QueryClient({
    // Los cinco minutos del QueryProvider de la app.
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
  });
});

afterEach(() => {
  queryClient.clear();
  jest.useRealTimers();
});

describe('PQRListScreen — búsqueda', () => {
  it('sin texto, el muro se pide de 10 en 10 y nada más', async () => {
    serve(wallOf(24));
    const { getByText, queryByText, reachEnd } = await openWall();

    expect(getByText('Solicitud 010')).toBeTruthy();
    expect(queryByText('Solicitud 011')).toBeNull();
    expect(queryByText(SEARCHING)).toBeNull();
    expect(asked()).toEqual([{ page: 1, limit: 10 }]);

    reachEnd();

    expect(asked()).toEqual([
      { page: 1, limit: 10 },
      { page: 2, limit: 10 },
    ]);
  });

  it('encuentra una PQRSD que está en la segunda página', async () => {
    serve(wallOf(24, { 16: { subject: 'Basura acumulada en la esquina' } }));
    const { getByText, queryByText, type } = await openWall();
    expect(queryByText('Basura acumulada en la esquina')).toBeNull();

    type('basura');

    await waitFor(() => expect(getByText('Basura acumulada en la esquina')).toBeTruthy());
    expect(queryByText('Solicitud 001')).toBeNull();
    expect(queryByText(NO_RESULTS)).toBeNull();
    expect(queryByText(SEARCHING)).toBeNull();
    // Las 24 están a la vista: no hay «más recientes» de las que hablar.
    expect(queryByText(/más recientes/)).toBeNull();
    // Lo que faltaba se pide de 50 en 50, y cabe en una petición.
    expect(asked()).toEqual([
      { page: 1, limit: 10 },
      { page: 1, limit: 50 },
    ]);
  });

  it('mientras llega el muro entero dice que está buscando y enseña lo que ya casa', async () => {
    const wholeWall = serveHoldingWholeWall(
      wallOf(24, {
        3: { subject: 'Basura en el parque' },
        16: { subject: 'Basura acumulada en la esquina' },
      }),
    );
    const { getByText, queryByText, type } = await openWall();

    type('basura');

    expect(getByText(SEARCHING)).toBeTruthy();
    expect(getByText('Basura en el parque')).toBeTruthy();
    expect(queryByText('Basura acumulada en la esquina')).toBeNull();

    await act(async () => {
      wholeWall.resolve();
    });
    await waitFor(() => expect(getByText('Basura acumulada en la esquina')).toBeTruthy());
    expect(getByText('Basura en el parque')).toBeTruthy();
    expect(queryByText(SEARCHING)).toBeNull();
  });

  it('no dice «Sin resultados» hasta tener el muro entero', async () => {
    const wholeWall = serveHoldingWholeWall(
      wallOf(24, { 16: { subject: 'Basura acumulada en la esquina' } }),
    );
    const { getByText, queryByText, type } = await openWall();

    // En la primera página no hay ninguna «basura», pero en la segunda sí.
    type('basura');

    expect(getByText(SEARCHING)).toBeTruthy();
    expect(queryByText(NO_RESULTS)).toBeNull();

    await act(async () => {
      wholeWall.resolve();
    });
    await waitFor(() => expect(getByText('Basura acumulada en la esquina')).toBeTruthy());
    expect(queryByText(NO_RESULTS)).toBeNull();
  });

  it('con el muro entero delante, y sin nada que case, dice «Sin resultados»', async () => {
    const wholeWall = serveHoldingWholeWall(wallOf(24));
    const { getByText, queryByText, type } = await openWall();

    type('basura');
    expect(queryByText(NO_RESULTS)).toBeNull();

    await act(async () => {
      wholeWall.resolve();
    });

    await waitFor(() => expect(getByText(NO_RESULTS)).toBeTruthy());
    expect(queryByText(SEARCHING)).toBeNull();
  });

  it('encuentra sin tildes y sin mayúsculas', async () => {
    serve(
      wallOf(24, {
        14: { subject: 'Basúra acumulada' },
        18: { subject: 'BASURA sin recoger' },
      }),
    );
    const { getByText, type } = await openWall();

    for (const text of ['basura', 'BASURA', 'Basúra']) {
      type(text);
      await waitFor(() => expect(getByText('Basúra acumulada')).toBeTruthy());
      expect(getByText('BASURA sin recoger')).toBeTruthy();
    }
  });

  it('no encuentra una PQRSD anónima por el nombre de quien la radicó', async () => {
    serve(
      wallOf(24, {
        16: {
          subject: 'Basura acumulada en la esquina',
          anonymous: true,
          // Tal como le llega a su propio autor: con el nombre puesto.
          creator: { id: 'user-9', name: 'Zoraida Pertuz' },
          creatorId: 'user-9',
        },
      }),
    );
    const { getByText, queryByText, type } = await openWall();

    type('zoraida');

    await waitFor(() => expect(getByText(NO_RESULTS)).toBeTruthy());
    expect(queryByText('Basura acumulada en la esquina')).toBeNull();
  });

  it('pasado el tope busca en las 500 más recientes, y lo dice', async () => {
    serve(
      wallOf(600, {
        500: { subject: 'Hueco en la vía' },
        551: { subject: 'Hueco frente al colegio' },
      }),
    );
    const { getByText, queryByText, type } = await openWall();

    type('hueco');

    await waitFor(() => expect(getByText(LIMIT_REACHED)).toBeTruthy());
    expect(getByText('Hueco en la vía')).toBeTruthy();
    expect(queryByText('Hueco frente al colegio')).toBeNull();
    // Diez páginas de 50, y ni una más.
    expect(
      asked()
        .filter((p) => p.limit === 50)
        .map((p) => p.page),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('si falla una página lo dice, no afirma «Sin resultados» y deja reintentar', async () => {
    const wall = wallOf(120, {
      3: { subject: 'Hueco en el parque' },
      111: { subject: 'Hueco frente al colegio' },
    });
    let failing = true;
    get.mockImplementation(async (_url: string, { params }: Request) => {
      if (failing && params.limit === 50 && params.page === 2) throw new Error('Network Error');
      return wallPage(wall, params);
    });
    const { getByText, queryByText, type } = await openWall();

    type('hueco');

    await waitFor(() => expect(getByText(FAILED)).toBeTruthy());
    expect(queryByText(SEARCHING)).toBeNull();
    // Lo que ya estaba cargado sigue a la vista, bajo el aviso.
    expect(getByText('Hueco en el parque')).toBeTruthy();
    expect(queryByText('Hueco frente al colegio')).toBeNull();

    failing = false;
    fireEvent.press(getByText('Reintentar'));

    await waitFor(() => expect(getByText('Hueco frente al colegio')).toBeTruthy());
    expect(getByText('Hueco en el parque')).toBeTruthy();
    expect(queryByText(FAILED)).toBeNull();
  });

  it('si falla y nada de lo cargado casa, tampoco dice «Sin resultados»', async () => {
    const wall = wallOf(24, { 16: { subject: 'Basura acumulada en la esquina' } });
    get.mockImplementation(async (_url: string, { params }: Request) => {
      if (params.limit === 50) throw new Error('Network Error');
      return wallPage(wall, params);
    });
    const { getByText, queryByText, type } = await openWall();

    type('basura');

    await waitFor(() => expect(getByText(FAILED)).toBeTruthy());
    expect(getByText('Reintentar')).toBeTruthy();
    expect(queryByText(NO_RESULTS)).toBeNull();
  });

  it('al borrar el texto vuelve el muro normal, que sigue de 10 en 10', async () => {
    serve(wallOf(24, { 16: { subject: 'Basura acumulada en la esquina' } }));
    const { getByText, queryByText, type, reachEnd } = await openWall();
    type('basura');
    await waitFor(() => expect(getByText('Basura acumulada en la esquina')).toBeTruthy());

    type('');

    // Lo que el muro llevaba cargado: su primera página, sin la 16.
    expect(getByText('Solicitud 001')).toBeTruthy();
    expect(getByText('Solicitud 010')).toBeTruthy();
    expect(queryByText('Basura acumulada en la esquina')).toBeNull();
    expect(queryByText(SEARCHING)).toBeNull();
    expect(queryByText(NO_RESULTS)).toBeNull();

    reachEnd();

    expect(asked()).toEqual([
      { page: 1, limit: 10 },
      { page: 1, limit: 50 },
      { page: 2, limit: 10 },
    ]);
  });

  it('una caja con solo espacios no es una búsqueda', async () => {
    serve(wallOf(24));
    const { getByText, queryByText, type, reachEnd } = await openWall();

    type('   ');

    expect(getByText('Solicitud 001')).toBeTruthy();
    expect(queryByText(SEARCHING)).toBeNull();
    expect(asked()).toEqual([{ page: 1, limit: 10 }]);

    // Y el muro sigue paginando.
    reachEnd();

    expect(asked()).toEqual([
      { page: 1, limit: 10 },
      { page: 2, limit: 10 },
    ]);
  });

  it('con texto en la caja, llegar al final de la lista no pagina el muro', async () => {
    serve(wallOf(24, { 16: { subject: 'Basura acumulada en la esquina' } }));
    const { getByText, type, reachEnd } = await openWall();
    type('basura');
    await waitFor(() => expect(getByText('Basura acumulada en la esquina')).toBeTruthy());

    reachEnd();

    expect(asked()).toEqual([
      { page: 1, limit: 10 },
      { page: 1, limit: 50 },
    ]);
  });

  it('tirar para refrescar con texto vuelve a pedir también el muro entero', async () => {
    const wall = wallOf(24, { 16: { subject: 'Basura acumulada en la esquina' } });
    serve(wall);
    const { getByText, type, pullToRefresh } = await openWall();
    type('basura');
    await waitFor(() => expect(getByText('Basura acumulada en la esquina')).toBeTruthy());

    // Entre tanto alguien radica otra.
    serve([pqr(0, { id: 'pqr-new', subject: 'Basura frente al colegio' }), ...wall]);
    pullToRefresh();

    await waitFor(() => expect(getByText('Basura frente al colegio')).toBeTruthy());
    expect(asked().slice(2)).toEqual([
      { page: 1, limit: 10 },
      { page: 1, limit: 50 },
    ]);
  });

  it('tirar para refrescar sin texto solo refresca el muro', async () => {
    serve(wallOf(24));
    const { pullToRefresh } = await openWall();

    pullToRefresh();

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(asked()).toEqual([
      { page: 1, limit: 10 },
      { page: 1, limit: 10 },
    ]);
  });
});

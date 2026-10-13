import React from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyPQRsScreen from '../MyPQRsScreen';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { PQRS } from '@core/types';

// Aquí los hooks son los de verdad: lo simulado es la API.
jest.mock('@core/api/client', () => ({ apiClient: { get: jest.fn() } }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@core/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, isAuthenticated: true }),
}));

// Como el de verdad: el efecto corre cuando la pestaña gana el foco y otra vez
// cada vez que cambia la función que recibe. `mockFocus.effect` es la última,
// para volver a la pestaña desde la prueba.
const mockFocus: { effect: (() => void) | null } = { effect: null };
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ navigate: jest.fn() }),
    useFocusEffect: (effect: () => void) => {
      React.useEffect(() => {
        mockFocus.effect = effect;
        effect();
      }, [effect]);
    },
  };
});

// De cada tarjeta basta el asunto para saber qué PQRSD hay en la lista.
jest.mock('@features/pqr/components/PQRCard', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Card = ({ pqr }: { pqr: { subject?: string } }) =>
    React.createElement(Text, null, pqr.subject);
  return { __esModule: true, default: Card };
});

const get = apiClient.get as jest.Mock;

const NONE_YET = 'Aún no has radicado ninguna PQRSD';
const LOADING_ALL = 'Cargando todas tus PQRSD…';
const NONE_IN_STATUS = 'No tienes PQRSDs con este estado';
const FAILED = 'No se pudieron cargar todas tus PQRSD.';
const LIMIT_REACHED = 'Filtrando entre tus 500 más recientes';
const FIRST_PAGE_FAILED = 'Error al cargar';

/** Las etiquetas de la barra de filtros. */
type Filter = 'Todas' | 'Pendiente' | 'En Proceso' | 'Resuelto' | 'Cerrado';

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
 * Las `size` PQRSD de una persona, de la más reciente a la más antigua.
 * `special` cambia la que ocupa ese puesto, contando desde 1: la 25 cae en la
 * tercera página de las de 10.
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

/** Como `serve`, pero la lista entera (las páginas de 50) no contesta hasta que se suelta. */
function serveHoldingWholeList(list: PQRS[]) {
  const wholeList = deferred();
  get.mockImplementation(async (_url: string, { params }: Request) => {
    if (params.limit === 50) await wholeList.promise;
    return listPage(list, params);
  });
  return wholeList;
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

/**
 * Abre «Mis PQRSD» y espera a su primera página, la única que pide al abrirse.
 * Con `waitForFirstPage: false` vuelve en cuanto la pantalla está montada.
 */
async function openMyPQRs({ waitForFirstPage = true } = {}) {
  const screen = render(
    <QueryClientProvider client={queryClient}>
      <MyPQRsScreen />
    </QueryClientProvider>,
  );
  if (waitForFirstPage) {
    await waitFor(() => {
      expect(get).toHaveBeenCalled();
      expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
    });
  }

  const list = () => screen.UNSAFE_getByType(FlatList);
  return {
    ...screen,
    /** Toca un filtro de la barra. */
    choose: (filter: Filter) => fireEvent.press(screen.getByText(filter)),
    /**
     * Los asuntos de lo que hay en la lista, en orden. La lista solo pinta las
     * primeras filas, así que lo que pasa de ahí se mira en sus datos.
     */
    subjects: (): string[] => list().props.data.map((p: PQRS) => p.subject),
    reachEnd: () =>
      act(() => {
        list().props.onEndReached();
      }),
    pullToRefresh: () =>
      act(() => {
        list().props.refreshControl.props.onRefresh();
      }),
    /** Volver a la pestaña desde el detalle o desde otra. */
    comeBack: () =>
      act(() => {
        mockFocus.effect?.();
      }),
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  get.mockReset();
  mockFocus.effect = null;
  queryClient = new QueryClient({
    // Los cinco minutos del QueryProvider de la app.
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
  });
});

afterEach(() => {
  queryClient.clear();
  jest.useRealTimers();
});

describe('MyPQRsScreen: contador', () => {
  it('con 30 y 10 cargadas dice «30 radicados»', async () => {
    serve(listOf(30));
    const { getByText, queryByText, subjects } = await openMyPQRs();

    // En el teléfono solo está la primera página.
    expect(subjects()).toHaveLength(10);
    expect(asked()).toEqual([{ page: 1, limit: 10 }]);

    expect(getByText('30 radicados')).toBeTruthy();
    expect(queryByText('10 radicados')).toBeNull();
  });

  it('con una sola dice «1 radicado», en singular', async () => {
    serve(listOf(1));
    const { getByText, queryByText } = await openMyPQRs();

    expect(getByText('1 radicado')).toBeTruthy();
    expect(queryByText('1 radicados')).toBeNull();
  });

  it('sin ninguna dice «Sin radicados aún»', async () => {
    serve([]);
    const { getByText } = await openMyPQRs();

    expect(getByText('Sin radicados aún')).toBeTruthy();
    expect(getByText(NONE_YET)).toBeTruthy();
  });

  it('sigue al total de la última página que llegó', async () => {
    const list = listOf(30);
    serve(list);
    const { getByText, reachEnd } = await openMyPQRs();
    expect(getByText('30 radicados')).toBeTruthy();

    // Radica otra desde la web, y luego baja por la lista.
    serve([pqr(0, { id: 'pqr-new' }), ...list]);
    reachEnd();

    await waitFor(() => expect(getByText('31 radicados')).toBeTruthy());
  });

  it('si el servidor no manda el total, cuenta lo cargado', async () => {
    const list = listOf(24);
    get.mockImplementation(async (_url: string, { params }: Request) => {
      const { totalCount, ...rest } = listPage(list, params).data;
      return { data: rest };
    });
    const { getByText, reachEnd } = await openMyPQRs();

    expect(getByText('10 radicados')).toBeTruthy();

    reachEnd();

    await waitFor(() => expect(getByText('20 radicados')).toBeTruthy());
  });
});

describe('MyPQRsScreen: «Todas»', () => {
  /** Los asuntos de `listOf`, en orden. */
  const SUBJECTS = listOf(24).map((p) => p.subject);

  it('pide las PQRSD de quien tiene la sesión, de 10 en 10', async () => {
    serve(listOf(24));
    const { subjects, reachEnd } = await openMyPQRs();

    expect(get).toHaveBeenCalledWith(ENDPOINTS.PQR.BY_USER('user-1'), expect.anything());
    expect(asked()).toEqual([{ page: 1, limit: 10 }]);
    expect(subjects()).toEqual(SUBJECTS.slice(0, 10));

    reachEnd();

    await waitFor(() => expect(subjects()).toEqual(SUBJECTS.slice(0, 20)));
    expect(asked()).toEqual([
      { page: 1, limit: 10 },
      { page: 2, limit: 10 },
    ]);
  });

  it('tirar para refrescar vuelve a pedir lo cargado', async () => {
    const list = listOf(24);
    serve(list);
    const { getByText, pullToRefresh } = await openMyPQRs();

    serve([pqr(0, { id: 'pqr-new', subject: 'Recién radicada' }), ...list]);
    pullToRefresh();

    await waitFor(() => expect(getByText('Recién radicada')).toBeTruthy());
    expect(asked()).toEqual([
      { page: 1, limit: 10 },
      { page: 1, limit: 10 },
    ]);
  });

  it('al volver a la pestaña se refresca', async () => {
    const list = listOf(24);
    serve(list);
    const { getByText, comeBack } = await openMyPQRs();

    // El primer foco no repite la petición con la que se abre la pantalla.
    expect(asked()).toEqual([{ page: 1, limit: 10 }]);

    // En el detalle la marcó como resuelta, o cambió desde otro sitio.
    serve(listOf(24, { 3: { subject: 'Ya resuelta' } }));
    comeBack();

    await waitFor(() => expect(getByText('Ya resuelta')).toBeTruthy());
    expect(asked()).toEqual([
      { page: 1, limit: 10 },
      { page: 1, limit: 10 },
    ]);
  });
});

describe('MyPQRsScreen: filtro por estado', () => {
  it('un estado que solo está en la tercera página se encuentra', async () => {
    serve(listOf(30, { 25: { status: 'RESOLVED', subject: 'Hueco ya tapado' } }));
    const { getByText, queryByText, subjects, choose } = await openMyPQRs();
    expect(subjects()).not.toContain('Hueco ya tapado');

    choose('Resuelto');

    await waitFor(() => expect(getByText('Hueco ya tapado')).toBeTruthy());
    expect(subjects()).toEqual(['Hueco ya tapado']);
    expect(queryByText(NONE_IN_STATUS)).toBeNull();
    expect(queryByText(LOADING_ALL)).toBeNull();
    // Las 30 están delante: no hay «más recientes» de las que hablar.
    expect(queryByText(/más recientes/)).toBeNull();
    // El contador sigue hablando de todas, no de las resueltas.
    expect(getByText('30 radicados')).toBeTruthy();
    // Lo que faltaba se pide de 50 en 50, y cabe en una petición.
    expect(asked()).toEqual([
      { page: 1, limit: 10 },
      { page: 1, limit: 50 },
    ]);
  });

  it('mientras llega la lista entera lo dice y enseña las que ya tiene de ese estado', async () => {
    const wholeList = serveHoldingWholeList(
      listOf(30, {
        3: { status: 'RESOLVED', subject: 'Poste ya reparado' },
        25: { status: 'RESOLVED', subject: 'Hueco ya tapado' },
      }),
    );
    const { getByText, queryByText, choose } = await openMyPQRs();

    choose('Resuelto');

    expect(getByText(LOADING_ALL)).toBeTruthy();
    expect(getByText('Poste ya reparado')).toBeTruthy();
    expect(queryByText('Hueco ya tapado')).toBeNull();

    await act(async () => {
      wholeList.resolve();
    });
    await waitFor(() => expect(getByText('Hueco ya tapado')).toBeTruthy());
    expect(getByText('Poste ya reparado')).toBeTruthy();
    expect(queryByText(LOADING_ALL)).toBeNull();
  });

  it('no dice «No tienes PQRSDs con este estado» hasta tener la lista entera', async () => {
    const wholeList = serveHoldingWholeList(
      listOf(30, { 25: { status: 'RESOLVED', subject: 'Hueco ya tapado' } }),
    );
    const { getByText, queryByText, choose } = await openMyPQRs();

    // Entre las 10 primeras no hay ninguna resuelta, pero en la tercera página sí.
    choose('Resuelto');

    expect(getByText(LOADING_ALL)).toBeTruthy();
    expect(queryByText(NONE_IN_STATUS)).toBeNull();

    await act(async () => {
      wholeList.resolve();
    });
    await waitFor(() => expect(getByText('Hueco ya tapado')).toBeTruthy());
    expect(queryByText(NONE_IN_STATUS)).toBeNull();
  });

  it('con la lista entera delante, y sin ninguna en ese estado, lo dice', async () => {
    const wholeList = serveHoldingWholeList(listOf(30));
    const { getByText, queryByText, choose } = await openMyPQRs();

    choose('Cerrado');
    expect(queryByText(NONE_IN_STATUS)).toBeNull();

    await act(async () => {
      wholeList.resolve();
    });

    await waitFor(() => expect(getByText(NONE_IN_STATUS)).toBeTruthy());
    expect(queryByText(LOADING_ALL)).toBeNull();
    expect(queryByText(NONE_YET)).toBeNull();
  });

  it('quien tiene 10 o menos filtra al momento, sin pedir nada más', async () => {
    serve(listOf(8, { 3: { status: 'RESOLVED', subject: 'Poste ya reparado' } }));
    const { getByText, queryByText, subjects, choose } = await openMyPQRs();

    choose('Resuelto');

    // Las 8 ya están en el teléfono: son la lista entera.
    expect(subjects()).toEqual(['Poste ya reparado']);
    expect(queryByText(LOADING_ALL)).toBeNull();

    choose('Cerrado');

    expect(getByText(NONE_IN_STATUS)).toBeTruthy();
    expect(queryByText(LOADING_ALL)).toBeNull();
    expect(asked()).toEqual([{ page: 1, limit: 10 }]);
  });

  it('pasar de un estado a otro no vuelve a pedir nada', async () => {
    serve(
      listOf(30, {
        12: { status: 'IN_PROGRESS', subject: 'Fuga en revisión' },
        25: { status: 'RESOLVED', subject: 'Hueco ya tapado' },
      }),
    );
    const { getByText, queryByText, choose } = await openMyPQRs();
    choose('Resuelto');
    await waitFor(() => expect(getByText('Hueco ya tapado')).toBeTruthy());

    choose('En Proceso');

    expect(getByText('Fuga en revisión')).toBeTruthy();
    expect(queryByText('Hueco ya tapado')).toBeNull();
    expect(queryByText(LOADING_ALL)).toBeNull();

    choose('Cerrado');

    expect(getByText(NONE_IN_STATUS)).toBeTruthy();
    // Ni la lista entera otra vez, ni la de 10 por haber tocado la barra.
    expect(asked()).toEqual([
      { page: 1, limit: 10 },
      { page: 1, limit: 50 },
    ]);
  });

  it('pasado el tope filtra las 500 más recientes, y lo dice', async () => {
    serve(
      listOf(600, {
        500: { status: 'CLOSED', subject: 'Queja archivada' },
        551: { status: 'CLOSED', subject: 'Queja más antigua' },
      }),
    );
    const { getByText, queryByText, choose } = await openMyPQRs();

    choose('Cerrado');

    await waitFor(() => expect(getByText(LIMIT_REACHED)).toBeTruthy());
    expect(getByText('Queja archivada')).toBeTruthy();
    expect(queryByText('Queja más antigua')).toBeNull();
    // Diez páginas de 50, y ni una más.
    expect(
      asked()
        .filter((p) => p.limit === 50)
        .map((p) => p.page),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('si falla una página lo dice, no afirma que no tiene y deja reintentar', async () => {
    const list = listOf(120, {
      3: { status: 'RESOLVED', subject: 'Poste ya reparado' },
      111: { status: 'RESOLVED', subject: 'Hueco ya tapado' },
    });
    let failing = true;
    get.mockImplementation(async (_url: string, { params }: Request) => {
      if (failing && params.limit === 50 && params.page === 2) throw new Error('Network Error');
      return listPage(list, params);
    });
    const { getByText, queryByText, choose } = await openMyPQRs();

    choose('Resuelto');

    await waitFor(() => expect(getByText(FAILED)).toBeTruthy());
    expect(queryByText(LOADING_ALL)).toBeNull();
    expect(queryByText(NONE_IN_STATUS)).toBeNull();
    // Lo que ya estaba cargado sigue a la vista, bajo el aviso.
    expect(getByText('Poste ya reparado')).toBeTruthy();
    expect(queryByText('Hueco ya tapado')).toBeNull();

    failing = false;
    fireEvent.press(getByText('Reintentar'));

    await waitFor(() => expect(getByText('Hueco ya tapado')).toBeTruthy());
    expect(getByText('Poste ya reparado')).toBeTruthy();
    expect(queryByText(FAILED)).toBeNull();
  });

  it('si falla y nada de lo cargado está en ese estado, tampoco dice que no tiene', async () => {
    const list = listOf(30, { 25: { status: 'RESOLVED', subject: 'Hueco ya tapado' } });
    get.mockImplementation(async (_url: string, { params }: Request) => {
      if (params.limit === 50) throw new Error('Network Error');
      return listPage(list, params);
    });
    const { getByText, queryByText, choose } = await openMyPQRs();

    choose('Resuelto');

    await waitFor(() => expect(getByText(FAILED)).toBeTruthy());
    // Un solo aviso, con su «Reintentar».
    expect(getByText('Reintentar')).toBeTruthy();
    expect(queryByText(NONE_IN_STATUS)).toBeNull();
    expect(queryByText(FIRST_PAGE_FAILED)).toBeNull();
  });

  it('si al refrescar con un estado elegido no llega nada, queda un solo aviso', async () => {
    serve(listOf(30, { 25: { status: 'RESOLVED', subject: 'Hueco ya tapado' } }));
    const { getByText, queryByText, choose, pullToRefresh } = await openMyPQRs();
    choose('Cerrado');
    await waitFor(() => expect(getByText(NONE_IN_STATUS)).toBeTruthy());

    // Se queda sin conexión: fallan la lista de 10 y la lista entera.
    get.mockRejectedValue(new Error('Network Error'));
    pullToRefresh();

    await waitFor(() => expect(getByText(FAILED)).toBeTruthy());
    // Lo dice el aviso del filtro, y no además el error de la primera página:
    // con dos «Reintentar» esta búsqueda fallaría.
    expect(getByText('Reintentar')).toBeTruthy();
    expect(queryByText(FIRST_PAGE_FAILED)).toBeNull();
    // Sin la lista de ahora no se repite que no tiene ninguna cerrada.
    expect(queryByText(NONE_IN_STATUS)).toBeNull();
  });

  it('volver a «Todas» deja la lista normal, que sigue de 10 en 10', async () => {
    const list = listOf(30, { 25: { status: 'RESOLVED', subject: 'Hueco ya tapado' } });
    serve(list);
    const { getByText, queryByText, subjects, choose, reachEnd } = await openMyPQRs();
    choose('Resuelto');
    await waitFor(() => expect(getByText('Hueco ya tapado')).toBeTruthy());

    choose('Todas');

    // Lo que la lista llevaba cargado: su primera página, sin la 25.
    expect(subjects()).toEqual(list.slice(0, 10).map((p) => p.subject));
    expect(queryByText(LOADING_ALL)).toBeNull();
    expect(queryByText(NONE_IN_STATUS)).toBeNull();
    expect(getByText('30 radicados')).toBeTruthy();

    reachEnd();

    await waitFor(() => expect(subjects()).toEqual(list.slice(0, 20).map((p) => p.subject)));
    expect(asked()).toEqual([
      { page: 1, limit: 10 },
      { page: 1, limit: 50 },
      { page: 2, limit: 10 },
    ]);
  });

  it('con un estado elegido, llegar al final de la lista no pagina', async () => {
    serve(listOf(30, { 25: { status: 'RESOLVED', subject: 'Hueco ya tapado' } }));
    const { getByText, choose, reachEnd } = await openMyPQRs();
    choose('Resuelto');
    await waitFor(() => expect(getByText('Hueco ya tapado')).toBeTruthy());

    reachEnd();

    expect(asked()).toEqual([
      { page: 1, limit: 10 },
      { page: 1, limit: 50 },
    ]);
  });

  it('tirar para refrescar con un estado elegido vuelve a pedir también la lista entera', async () => {
    const list = listOf(30, { 25: { status: 'RESOLVED', subject: 'Hueco ya tapado' } });
    serve(list);
    const { getByText, choose, pullToRefresh } = await openMyPQRs();
    choose('Resuelto');
    await waitFor(() => expect(getByText('Hueco ya tapado')).toBeTruthy());

    // Entre tanto le resuelven otra, también fuera de la primera página.
    serve(
      listOf(30, {
        18: { status: 'RESOLVED', subject: 'Fuga ya arreglada' },
        25: { status: 'RESOLVED', subject: 'Hueco ya tapado' },
      }),
    );
    pullToRefresh();

    await waitFor(() => expect(getByText('Fuga ya arreglada')).toBeTruthy());
    expect(asked().slice(2)).toEqual([
      { page: 1, limit: 10 },
      { page: 1, limit: 50 },
    ]);
  });

  it('al volver a la pestaña con un estado elegido se refresca también la lista entera', async () => {
    const list = listOf(30, { 25: { status: 'RESOLVED', subject: 'Hueco ya tapado' } });
    serve(list);
    const { getByText, choose, comeBack } = await openMyPQRs();
    choose('Resuelto');
    await waitFor(() => expect(getByText('Hueco ya tapado')).toBeTruthy());

    serve(
      listOf(30, {
        18: { status: 'RESOLVED', subject: 'Fuga ya arreglada' },
        25: { status: 'RESOLVED', subject: 'Hueco ya tapado' },
      }),
    );
    comeBack();

    await waitFor(() => expect(getByText('Fuga ya arreglada')).toBeTruthy());
    expect(asked().slice(2)).toEqual([
      { page: 1, limit: 10 },
      { page: 1, limit: 50 },
    ]);
  });

  it('quien tiene 10 o menos sigue refrescando solo su lista', async () => {
    serve(listOf(8, { 3: { status: 'RESOLVED', subject: 'Poste ya reparado' } }));
    const { getByText, choose, pullToRefresh, comeBack } = await openMyPQRs();
    choose('Resuelto');

    serve(
      listOf(8, {
        3: { status: 'RESOLVED', subject: 'Poste ya reparado' },
        6: { status: 'RESOLVED', subject: 'Fuga ya arreglada' },
      }),
    );
    pullToRefresh();

    // El filtro sale de la lista de la pantalla, así que ve lo recién llegado.
    await waitFor(() => expect(getByText('Fuga ya arreglada')).toBeTruthy());
    expect(getByText('Poste ya reparado')).toBeTruthy();

    comeBack();

    await waitFor(() => expect(get).toHaveBeenCalledTimes(3));
    expect(asked()).toEqual([
      { page: 1, limit: 10 },
      { page: 1, limit: 10 },
      { page: 1, limit: 10 },
    ]);
  });

  it('si la primera página no llega, un estado elegido no cambia el error de siempre', async () => {
    get.mockRejectedValue(new Error('Network Error'));
    const { getByText, queryByText, choose } = await openMyPQRs();
    expect(getByText(FIRST_PAGE_FAILED)).toBeTruthy();

    choose('Resuelto');

    expect(getByText(FIRST_PAGE_FAILED)).toBeTruthy();
    expect(queryByText(FAILED)).toBeNull();
    expect(queryByText(LOADING_ALL)).toBeNull();
    expect(queryByText(NONE_IN_STATUS)).toBeNull();
    // Sin primera página no se pide la lista entera.
    expect(asked()).toEqual([{ page: 1, limit: 10 }]);
  });

  it('elegir un estado mientras llega la primera página no afirma nada', async () => {
    const list = listOf(30, { 25: { status: 'RESOLVED', subject: 'Hueco ya tapado' } });
    const firstPage = deferred();
    get.mockImplementation(async (_url: string, { params }: Request) => {
      if (params.limit === 10) await firstPage.promise;
      return listPage(list, params);
    });
    const { getByText, queryByText, choose } = await openMyPQRs({ waitForFirstPage: false });

    choose('Resuelto');

    expect(queryByText(NONE_IN_STATUS)).toBeNull();
    expect(queryByText(NONE_YET)).toBeNull();
    expect(asked()).toEqual([{ page: 1, limit: 10 }]);

    await act(async () => {
      firstPage.resolve();
    });

    // Con la primera página se sabe que hay más, y se trae la lista entera.
    await waitFor(() => expect(getByText('Hueco ya tapado')).toBeTruthy());
    expect(queryByText(NONE_IN_STATUS)).toBeNull();
    expect(asked()).toEqual([
      { page: 1, limit: 10 },
      { page: 1, limit: 50 },
    ]);
  });
});

import React from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';
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

/** Las páginas pedidas, en orden. */
function asked(): PageParams[] {
  return get.mock.calls.map(([, config]) => config.params);
}

let queryClient: QueryClient;

/** Abre «Mis PQRSD» y espera a su primera página, la única que pide al abrirse. */
async function openMyPQRs() {
  const screen = render(
    <QueryClientProvider client={queryClient}>
      <MyPQRsScreen />
    </QueryClientProvider>,
  );
  await waitFor(() => {
    expect(get).toHaveBeenCalled();
    expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
  });

  const list = () => screen.UNSAFE_getByType(FlatList);
  return {
    ...screen,
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

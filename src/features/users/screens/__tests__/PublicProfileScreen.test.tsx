import React from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { render, renderHook, fireEvent, act, waitFor, within } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PublicProfileScreen from '../PublicProfileScreen';
import MyPQRsScreen from '@features/pqr/screens/MyPQRsScreen';
import { useCreatePQR } from '@features/pqr/hooks/useCreatePQR';
import type { CreatePQRInput } from '@features/pqr/hooks/useCreatePQR';
import { useLikePQR } from '@features/pqr/hooks/usePQRActions';
import { usePQRDetail } from '@features/pqr/hooks/usePQRDetail';
import { withErrorBoundary } from '@shared/components/ui/withErrorBoundary';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { PQRS, UserProfile } from '@core/types';

// Aquí las pantallas y los hooks son los de verdad: lo simulado es la API.
jest.mock('@core/api/client', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));

jest.mock('@shared/utils/s3Upload', () => ({ uploadToS3: jest.fn() }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => children ?? null,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@core/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, isAuthenticated: true }),
}));

// El perfil que se abre es el de `mockRoute.params.userId`. El efecto de foco
// es como el de verdad: corre cuando la pestaña gana el foco y otra vez cada
// vez que cambia la función que recibe. `mockFocus.effect` es la última, para
// volver a «Mis PQRSD» desde la prueba.
const mockRoute = { params: { userId: 'user-1' } };
const mockFocus: { effect: (() => void) | null } = { effect: null };
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ navigate: jest.fn() }),
    useRoute: () => mockRoute,
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
const post = apiClient.post as jest.Mock;

/** Quien tiene la sesión, y otra persona. */
const ME = 'user-1';
const OTHER = 'user-2';

const NAMES: Record<string, string> = { [ME]: 'Juan García', [OTHER]: 'Gladys Márquez' };

const SCREEN_BROKEN = 'Ocurrió un problema al mostrar esta pantalla. Inténtalo de nuevo.';
const NO_PQRS = 'No ha publicado PQRSDs';
const FIVE_MINUTES = 5 * 60 * 1000;

/** Lo que pide «Mis PQRSD» al abrirse, y lo que pide el perfil. */
const MY_PQRS_FIRST_PAGE = { page: 1, limit: 10 };
const PROFILE_PAGE = { page: 1, limit: 20 };

type PageParams = { page: number; limit: number };

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
    creator: { id: ME, name: NAMES[ME] },
    attachments: [],
    comments: [],
    likes: [],
    customFieldValues: [],
    ...over,
  };
}

/**
 * Las `size` PQRSD de una persona, de la más reciente a la más antigua.
 * `special` cambia la que ocupa ese puesto, contando desde 1.
 */
function listOf(size: number, special: Record<number, Partial<PQRS>> = {}): PQRS[] {
  return Array.from({ length: size }, (_, i) => pqr(i + 1, special[i + 1]));
}

function subjectsOf(list: PQRS[]): string[] {
  return list.map((p) => p.subject as string);
}

/** Lo que contesta `GET /pqr/user/:id`: por desplazamiento, con el total. */
function listPage(list: PQRS[], { page, limit }: PageParams) {
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

function userProfile(id: string, pqrs: number): UserProfile {
  return {
    id,
    name: NAMES[id],
    role: 'CLIENT',
    isActive: true,
    isVerified: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    _count: { followers: 4, following: 2, PQRS: pqrs },
    followers: [],
    following: [],
    isFollowing: false,
  };
}

/** Las PQRSD que tiene cada persona en el servidor, de la más reciente a la más antigua. */
let server: Record<string, PQRS[]>;

/** Las páginas de PQRSD de `userId` que se han pedido, en orden. */
function asked(userId: string): PageParams[] {
  return get.mock.calls
    .filter(([url]) => url === ENDPOINTS.PQR.BY_USER(userId))
    .map(([, config]) => config.params);
}

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

// Envueltas como en la app (AppTabNavigator.tsx y AppNavigator.tsx): cuando una
// pantalla no puede pintar, lo que se ve es `SCREEN_BROKEN`.
const MyPQRsTab = withErrorBoundary(MyPQRsScreen);
const PublicProfile = withErrorBoundary(PublicProfileScreen);

/**
 * Las dos pantallas sobre la misma caché, como en la app. La pestaña no se
 * desmonta una vez abierta; el perfil se abre encima y se cierra.
 */
function App({ myPqrs, profile }: { myPqrs: boolean; profile: boolean }) {
  return (
    <QueryClientProvider client={queryClient}>
      {myPqrs ? (
        <View testID="my-pqrs">
          <MyPQRsTab />
        </View>
      ) : null}
      {profile ? (
        <View testID="profile">
          <PublicProfile />
        </View>
      ) : null}
    </QueryClientProvider>
  );
}

function startApp() {
  let open = { myPqrs: false, profile: false };
  const screen = render(<App {...open} />);
  const show = (next: Partial<typeof open>) => {
    open = { ...open, ...next };
    screen.rerender(<App {...open} />);
  };

  const myPqrs = () => within(screen.getByTestId('my-pqrs'));
  const profile = () => within(screen.getByTestId('profile'));
  /**
   * Lo que hay en una lista, en orden. Solo pinta las primeras filas, así que
   * lo que pasa de ahí se mira en sus datos.
   */
  const rows = (scope: ReturnType<typeof within>): PQRS[] =>
    scope.UNSAFE_getByType(FlatList).props.data;
  /** Una pantalla ha terminado de cargar cuando no le queda ningún indicador. */
  const settled = (scope: () => ReturnType<typeof within>) =>
    waitFor(() => expect(scope().UNSAFE_queryByType(ActivityIndicator)).toBeNull());

  return {
    /** Deja pasar el tiempo sin tocar nada. */
    wait: (ms: number) =>
      act(async () => {
        jest.advanceTimersByTime(ms);
      }),
    myPqrs: {
      /** Toca la pestaña por primera vez y espera a que pinte. */
      open: async () => {
        show({ myPqrs: true });
        await settled(myPqrs);
      },
      queryByText: (text: string) => myPqrs().queryByText(text),
      getByText: (text: string) => myPqrs().getByText(text),
      subjects: () => subjectsOf(rows(myPqrs())),
      choose: (filter: string) => fireEvent.press(myPqrs().getByText(filter)),
      reachEnd: () =>
        act(() => {
          myPqrs().UNSAFE_getByType(FlatList).props.onEndReached();
        }),
      pullToRefresh: () =>
        act(() => {
          myPqrs().UNSAFE_getByType(FlatList).props.refreshControl.props.onRefresh();
        }),
      /** Volver a la pestaña desde el perfil, el detalle u otra pestaña. */
      comeBack: () =>
        act(() => {
          mockFocus.effect?.();
        }),
    },
    profile: {
      /** Abre el perfil de `userId` y espera a que pinte. */
      open: async (userId: string) => {
        mockRoute.params = { userId };
        show({ profile: true });
        await settled(profile);
      },
      close: () => show({ profile: false }),
      queryByText: (text: string) => profile().queryByText(text),
      getByText: (text: string) => profile().getByText(text),
      subjects: () => subjectsOf(rows(profile())),
      /** El estado con el que sale una PQRSD en la lista del perfil. */
      statusOf: (id: string) => rows(profile()).find((p) => p.id === id)?.status,
    },
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  get.mockReset();
  post.mockReset();
  mockFocus.effect = null;
  mockRoute.params = { userId: ME };
  server = { [ME]: [], [OTHER]: [] };
  get.mockImplementation(async (url: string, config?: { params: PageParams }) => {
    for (const [userId, list] of Object.entries(server)) {
      if (url === ENDPOINTS.USERS.DETAIL(userId)) return { data: userProfile(userId, list.length) };
      if (url === ENDPOINTS.PQR.BY_USER(userId)) return listPage(list, config!.params);
      const detail = list.find((p) => url === ENDPOINTS.PQR.DETAIL(p.id));
      if (detail) return { data: detail };
    }
    throw new Error(`Petición que la prueba no esperaba: GET ${url}`);
  });
  queryClient = new QueryClient({
    // Los cinco minutos del QueryProvider de la app: con ellos, una lista ya
    // pedida no se vuelve a pedir sola al abrir otra pantalla.
    defaultOptions: {
      queries: { retry: false, staleTime: FIVE_MINUTES },
      mutations: { retry: false },
    },
  });
});

afterEach(() => {
  queryClient.clear();
  jest.useRealTimers();
});

describe('PublicProfileScreen: el perfil de otra persona', () => {
  it('pide sus PQRSD y las enseña, con el botón de seguir', async () => {
    server[OTHER] = [
      pqr(1, { subject: 'Alumbrado de la 45', creator: { id: OTHER, name: NAMES[OTHER] } }),
      pqr(2, { subject: 'Hueco en la avenida', creator: { id: OTHER, name: NAMES[OTHER] } }),
    ];
    const app = startApp();

    await app.profile.open(OTHER);

    expect(app.profile.getByText('Gladys Márquez')).toBeTruthy();
    expect(app.profile.subjects()).toEqual(['Alumbrado de la 45', 'Hueco en la avenida']);
    expect(app.profile.queryByText(NO_PQRS)).toBeNull();
    expect(app.profile.getByText('Seguir')).toBeTruthy();
    expect(asked(OTHER)).toEqual([PROFILE_PAGE]);
    // De quien tiene la sesión no se pide nada.
    expect(asked(ME)).toEqual([]);
  });

  it('si no ha publicado ninguna, lo dice', async () => {
    const app = startApp();

    await app.profile.open(OTHER);

    expect(app.profile.getByText(NO_PQRS)).toBeTruthy();
    expect(app.profile.subjects()).toEqual([]);
  });

  it('un «me gusta» refresca el perfil que está abierto', async () => {
    server[OTHER] = [pqr(1, { subject: 'Alumbrado de la 45' })];
    const app = startApp();
    await app.profile.open(OTHER);

    // Entre tanto esa persona publica otra. El «me gusta», como un comentario
    // o un cambio de privacidad, invalida todas las listas por usuario.
    server[OTHER] = [pqr(2, { subject: 'Hueco en la avenida' }), ...server[OTHER]];
    post.mockResolvedValue({ data: { likes: 1, liked: true } });
    const like = renderHook(() => useLikePQR('pqr-001'), { wrapper });
    await act(async () => {
      await like.result.current.mutateAsync({ userId: ME });
    });

    await waitFor(() =>
      expect(app.profile.subjects()).toEqual(['Hueco en la avenida', 'Alumbrado de la 45']),
    );
    expect(asked(OTHER)).toEqual([PROFILE_PAGE, PROFILE_PAGE]);
  });
});

describe('PublicProfileScreen: el perfil propio y «Mis PQRSD»', () => {
  it('con «Mis PQRSD» cargada, el perfil propio enseña sus PQRSD', async () => {
    server[ME] = listOf(24);
    const app = startApp();
    await app.myPqrs.open();

    await app.profile.open(ME);

    expect(app.profile.queryByText(NO_PQRS)).toBeNull();
    // Cada pantalla con lo suyo: el perfil pide 20 y la pestaña sigue con sus 10.
    expect(app.profile.subjects()).toEqual(subjectsOf(server[ME]).slice(0, 20));
    expect(app.myPqrs.subjects()).toEqual(subjectsOf(server[ME]).slice(0, 10));
    expect(asked(ME)).toEqual([MY_PQRS_FIRST_PAGE, PROFILE_PAGE]);
    // En el perfil propio no hay a quién seguir.
    expect(app.profile.queryByText('Seguir')).toBeNull();
  });

  it('después de que el perfil propio pida sus PQRSD, «Mis PQRSD» sigue pintando y se refresca', async () => {
    server[ME] = listOf(24);
    const app = startApp();
    await app.myPqrs.open();

    // Pasan los cinco minutos que la lista de la pestaña se da por fresca: a
    // partir de ahí el perfil pedía la suya incluso con la clave compartida.
    await app.wait(FIVE_MINUTES + 1000);
    await app.profile.open(ME);
    expect(asked(ME)).toEqual([MY_PQRS_FIRST_PAGE, PROFILE_PAGE]);
    app.profile.close();

    expect(app.myPqrs.queryByText(SCREEN_BROKEN)).toBeNull();
    expect(app.myPqrs.subjects()).toEqual(subjectsOf(server[ME]).slice(0, 10));

    // Al volver a la pestaña se refresca.
    server[ME] = listOf(24, { 3: { status: 'RESOLVED', subject: 'Poste ya reparado' } });
    app.myPqrs.comeBack();
    await waitFor(() => expect(app.myPqrs.subjects()).toContain('Poste ya reparado'));

    // Tirar para refrescar, también.
    server[ME] = [pqr(0, { id: 'pqr-new', subject: 'Recién radicada' }), ...server[ME]];
    app.myPqrs.pullToRefresh();
    await waitFor(() => expect(app.myPqrs.subjects()[0]).toBe('Recién radicada'));
    expect(app.myPqrs.getByText('25 enviadas')).toBeTruthy();

    // Sigue paginando, y tocar la barra de filtros no la rompe.
    app.myPqrs.reachEnd();
    await waitFor(() => expect(app.myPqrs.subjects()).toHaveLength(20));
    app.myPqrs.choose('Resuelto');
    await waitFor(() => expect(app.myPqrs.subjects()).toEqual(['Poste ya reparado']));
    expect(app.myPqrs.queryByText(SCREEN_BROKEN)).toBeNull();
  });

  it('abrir el perfil propio antes que «Mis PQRSD» no deja la pestaña sin pintar', async () => {
    server[ME] = listOf(24);
    const app = startApp();
    await app.profile.open(ME);
    expect(app.profile.subjects()).toEqual(subjectsOf(server[ME]).slice(0, 20));
    app.profile.close();

    // Es la primera vez que se toca la pestaña en la sesión.
    await app.myPqrs.open();

    expect(app.myPqrs.queryByText(SCREEN_BROKEN)).toBeNull();
    expect(app.myPqrs.subjects()).toEqual(subjectsOf(server[ME]).slice(0, 10));
    expect(app.myPqrs.getByText('24 enviadas')).toBeTruthy();
    expect(asked(ME)).toEqual([PROFILE_PAGE, MY_PQRS_FIRST_PAGE]);

    server[ME] = listOf(24, { 3: { status: 'RESOLVED', subject: 'Poste ya reparado' } });
    app.myPqrs.pullToRefresh();
    await waitFor(() => expect(app.myPqrs.subjects()).toContain('Poste ya reparado'));

    app.myPqrs.reachEnd();
    await waitFor(() => expect(app.myPqrs.subjects()).toHaveLength(20));

    // Y el perfil, al volver a abrirlo, sigue enseñando las suyas.
    await app.profile.open(ME);
    expect(app.profile.subjects()).toHaveLength(20);
    expect(app.profile.queryByText(NO_PQRS)).toBeNull();
  });

  it('radicar una PQRSD refresca el perfil propio', async () => {
    server[ME] = listOf(3);
    const app = startApp();
    await app.profile.open(ME);
    expect(app.profile.subjects()).toEqual(subjectsOf(server[ME]));
    app.profile.close();

    // Radica una, como CreatePQRScreen: con el id de quien tiene la sesión.
    const created = pqr(0, { id: 'pqr-new', subject: 'Recién radicada' });
    server[ME] = [created, ...server[ME]];
    post.mockResolvedValue({ data: created });
    const input: CreatePQRInput = {
      type: 'COMPLAINT',
      entityId: 'entity-1',
      isAnonymous: false,
      isPrivate: false,
      customFields: [],
      localAttachments: [],
      recaptchaToken: 'test-token',
    };
    const create = renderHook(() => useCreatePQR(ME), { wrapper });
    await act(async () => {
      await create.result.current.createPQR(input);
    });

    // Vuelve a su perfil antes de cinco minutos: si radicar no alcanzara a la
    // lista del perfil, seguiría dándose por fresca y saldría sin la nueva.
    await app.profile.open(ME);

    await waitFor(() => expect(app.profile.subjects()[0]).toBe('Recién radicada'));
    expect(app.profile.subjects()).toHaveLength(4);
  });
});

describe('PublicProfileScreen: una PQRSD abierta desde el perfil', () => {
  it('si el detalle la trae ya resuelta, deja de salir como pendiente en el perfil', async () => {
    server[OTHER] = listOf(3);
    const app = startApp();
    await app.profile.open(OTHER);
    expect(app.profile.statusOf('pqr-002')).toBe('PENDING');

    // Se toca su tarjeta, y el detalle la trae ya resuelta.
    server[OTHER] = listOf(3, { 2: { status: 'RESOLVED' } });
    const detail = renderHook(() => usePQRDetail('pqr-002'), { wrapper });
    await waitFor(() => expect(detail.result.current.data?.status).toBe('RESOLVED'));

    // El perfil sigue montado debajo del detalle y al volver no pide nada: lo
    // que enseña es lo que tenga en caché.
    await waitFor(() => expect(app.profile.statusOf('pqr-002')).toBe('RESOLVED'));
    expect(app.profile.statusOf('pqr-001')).toBe('PENDING');
    expect(asked(OTHER)).toEqual([PROFILE_PAGE]);
  });
});

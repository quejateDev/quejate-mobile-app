import React from 'react';
import { FlatList } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import PQRListScreen from '../PQRListScreen';
import { usePQRList } from '@features/pqr/hooks/usePQRList';
import { useWallSearch } from '@features/pqr/hooks/useWallSearch';
import { useNotifications } from '@features/notifications/hooks/useNotifications';
import type { PQRS } from '@core/types';

jest.mock('@core/api/client', () => ({ apiClient: { get: jest.fn() } }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@features/pqr/hooks/usePQRList', () => ({ usePQRList: jest.fn() }));
jest.mock('@features/notifications/hooks/useNotifications', () => ({
  useNotifications: jest.fn(),
}));
// De cada tarjeta basta el asunto; así no se arrastra su reproductor de vídeo.
jest.mock('@features/pqr/components/PQRCard', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Card = ({ pqr }: { pqr: { subject?: string } }) =>
    React.createElement(Text, null, pqr.subject);
  return { __esModule: true, default: Card };
});
// Tampoco de la búsqueda, que tiene sus pruebas en PQRListScreen.search.test.tsx.
jest.mock('@features/pqr/hooks/useWallSearch', () => ({
  ...jest.requireActual('@features/pqr/hooks/useWallSearch'),
  useWallSearch: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (usePQRList as jest.Mock).mockReturnValue({
    data: { pages: [{ pqrs: [] }] },
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    isLoadingError: false,
    isFetchNextPageError: false,
    isRefetchError: false,
    refetch: jest.fn(),
    isRefetching: false,
  });
  (useWallSearch as jest.Mock).mockReturnValue({
    status: 'idle',
    results: [],
    limitReached: false,
    refetch: jest.fn(),
  });
  (useNotifications as jest.Mock).mockReturnValue({ data: [] });
});

describe('PQRListScreen — cabecera', () => {
  it('el icono de personas abre el buscador de personas', () => {
    const { getByLabelText } = render(<PQRListScreen />);

    fireEvent.press(getByLabelText('Buscar personas'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('PeopleSearch');
  });

  it('el mapa y las notificaciones siguen a su lado', () => {
    const { getByLabelText } = render(<PQRListScreen />);

    fireEvent.press(getByLabelText('Mapa ciudadano'));
    fireEvent.press(getByLabelText('Notificaciones'));

    expect(mockNavigate.mock.calls).toEqual([['MapaCiudadano'], ['Notificaciones']]);
  });
});

describe('PQRListScreen — cuando el muro no carga', () => {
  const LOAD_FAILED = 'No se pudieron cargar las PQRSDs. Verifica tu conexión.';
  const MORE_FAILED = 'No se pudieron cargar más PQRSD.';
  const REFRESH_FAILED = 'No se pudo actualizar el muro.';
  const SEARCH_BOX = 'Buscar PQRSD...';

  /** Una página de 10 PQRSD; la primera va de la 1 a la 10. */
  function page(n: number) {
    const pqrs = Array.from({ length: 10 }, (_, i) => {
      const code = String((n - 1) * 10 + i + 1).padStart(3, '0');
      return { id: `pqr-${code}`, subject: `Solicitud ${code}` } as PQRS;
    });
    return { pqrs, hasMore: true, nextPage: n + 1 };
  }

  let fetchNextPage: jest.Mock;
  let refetch: jest.Mock;

  /** Lo que devuelve `usePQRList`: la primera página cargada, cambiando lo que diga `state`. */
  function showWall(state: Record<string, unknown>) {
    (usePQRList as jest.Mock).mockReturnValue({
      data: { pages: [page(1)] },
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
      isLoading: false,
      isLoadingError: false,
      isFetchNextPageError: false,
      isRefetchError: false,
      refetch,
      isRefetching: false,
      ...state,
    });
  }

  function reachEnd(screen: ReturnType<typeof render>) {
    act(() => {
      screen.UNSAFE_getByType(FlatList).props.onEndReached();
    });
  }

  beforeEach(() => {
    fetchNextPage = jest.fn();
    refetch = jest.fn();
  });

  it('si falla la primera carga, enseña el error a pantalla completa', () => {
    showWall({ data: undefined, isError: true, isLoadingError: true, hasNextPage: false });

    const screen = render(<PQRListScreen />);

    expect(screen.getByText(LOAD_FAILED)).toBeTruthy();
    expect(screen.queryByPlaceholderText(SEARCH_BOX)).toBeNull();

    fireEvent.press(screen.getByText('Reintentar'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('si falla la página siguiente, siguen las tarjetas y la búsqueda, con el aviso al final', () => {
    showWall({ isError: true, isFetchNextPageError: true });

    const screen = render(<PQRListScreen />);

    expect(screen.queryByText(LOAD_FAILED)).toBeNull();
    expect(screen.getByText('Solicitud 001')).toBeTruthy();
    expect(screen.getByText('Solicitud 010')).toBeTruthy();
    expect(screen.getByPlaceholderText(SEARCH_BOX)).toBeTruthy();
    expect(screen.getByText(MORE_FAILED)).toBeTruthy();
  });

  it('«Reintentar» pide la página siguiente', () => {
    showWall({ isError: true, isFetchNextPageError: true });

    const screen = render(<PQRListScreen />);
    fireEvent.press(screen.getByText('Reintentar'));

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(refetch).not.toHaveBeenCalled();
  });

  it('con el aviso a la vista, llegar al final no vuelve a pedir la página', () => {
    showWall({ isError: true, isFetchNextPageError: true });

    const screen = render(<PQRListScreen />);
    reachEnd(screen);
    reachEnd(screen);

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('sin fallo, llegar al final sí pide la página siguiente', () => {
    showWall({});

    const screen = render(<PQRListScreen />);
    reachEnd(screen);

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('mientras se reintenta, el aviso deja paso a la rueda de carga', () => {
    // TanStack Query conserva el error mientras vuelve a pedir la página.
    showWall({ isError: true, isFetchNextPageError: true, isFetchingNextPage: true });

    const screen = render(<PQRListScreen />);

    expect(screen.queryByText(MORE_FAILED)).toBeNull();
    expect(screen.getByText('Solicitud 001')).toBeTruthy();
  });

  it('cuando la página llega, el aviso desaparece', () => {
    showWall({ isError: true, isFetchNextPageError: true });
    const screen = render(<PQRListScreen />);
    expect(screen.getByText(MORE_FAILED)).toBeTruthy();

    showWall({ data: { pages: [page(1), page(2)] } });
    screen.rerender(<PQRListScreen />);

    expect(screen.queryByText(MORE_FAILED)).toBeNull();
    expect(screen.getByText('Solicitud 001')).toBeTruthy();
    // La lista no pinta de golpe más de 10 tarjetas: lo que lleva se mira en sus datos.
    expect(screen.UNSAFE_getByType(FlatList).props.data).toHaveLength(20);
  });

  it('si falla un refresco con la lista cargada, la lista sigue y se dice que no se actualizó', () => {
    showWall({ isError: true, isRefetchError: true });

    const screen = render(<PQRListScreen />);

    expect(screen.queryByText(LOAD_FAILED)).toBeNull();
    expect(screen.getByText('Solicitud 001')).toBeTruthy();
    expect(screen.getByPlaceholderText(SEARCH_BOX)).toBeTruthy();
    expect(screen.getByText(REFRESH_FAILED)).toBeTruthy();
    expect(screen.queryByText(MORE_FAILED)).toBeNull();

    fireEvent.press(screen.getByText('Reintentar'));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('mientras se vuelve a refrescar, el aviso del refresco no se ve', () => {
    showWall({ isError: true, isRefetchError: true, isRefetching: true });

    const screen = render(<PQRListScreen />);

    expect(screen.queryByText(REFRESH_FAILED)).toBeNull();
  });

  it('cuando el refresco sale bien, el aviso desaparece', () => {
    showWall({ isError: true, isRefetchError: true });
    const screen = render(<PQRListScreen />);
    expect(screen.getByText(REFRESH_FAILED)).toBeTruthy();

    showWall({});
    screen.rerender(<PQRListScreen />);

    expect(screen.queryByText(REFRESH_FAILED)).toBeNull();
    expect(screen.getByText('Solicitud 001')).toBeTruthy();
  });

  it('mientras se busca, los avisos del muro se callan', () => {
    showWall({ isError: true, isFetchNextPageError: true });
    (useWallSearch as jest.Mock).mockReturnValue({
      status: 'complete',
      results: page(1).pqrs.slice(0, 1),
      limitReached: false,
      refetch: jest.fn(),
    });

    const screen = render(<PQRListScreen />);

    expect(screen.queryByText(MORE_FAILED)).toBeNull();
    expect(screen.getByText('Solicitud 001')).toBeTruthy();
  });
});

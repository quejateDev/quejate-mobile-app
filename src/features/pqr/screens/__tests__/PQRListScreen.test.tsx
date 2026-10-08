import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PQRListScreen from '../PQRListScreen';
import { usePQRList } from '@features/pqr/hooks/usePQRList';
import { useNotifications } from '@features/notifications/hooks/useNotifications';

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
// La cabecera no depende de las tarjetas; así no se arrastra su reproductor de vídeo.
jest.mock('@features/pqr/components/PQRCard', () => () => null);

beforeEach(() => {
  jest.clearAllMocks();
  (usePQRList as jest.Mock).mockReturnValue({
    data: { pages: [{ pqrs: [] }] },
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    isRefetching: false,
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

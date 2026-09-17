import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MapScreen from '../MapScreen';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { MapPQR } from '@core/types';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((cb: () => void) => cb()),
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

jest.mock('@core/api/client', () => ({
  apiClient: { get: jest.fn() },
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MapView = React.forwardRef(({ children }: any, _ref: any) =>
    React.createElement(View, { testID: 'map-view' }, children),
  );
  const Marker = ({ children, onPress }: any) =>
    React.createElement(View, { testID: 'map-marker', onPress }, children);
  const Callout = ({ children }: any) =>
    React.createElement(View, null, children);

  return { __esModule: true, default: MapView, Marker, Callout };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Forma exacta que devuelve GET /pqr/map (array pelado, campos recortados).
const basePQR: MapPQR = {
  id: 'pqr-1',
  subject: 'Problema de agua',
  type: 'PETITION',
  status: 'PENDING',
  latitude: 4.711,
  longitude: -74.0721,
  createdAt: new Date('2024-01-15'),
  anonymous: false,
  creatorId: 'user-1',
  entity: { name: 'Alcaldía de Bogotá' },
  creator: { id: 'user-1', name: 'Ana Ruiz' },
};

// El servidor ya excluye las PQRSD sin coordenadas; el cast documenta que esta
// forma no es parte del contrato y solo ejercita el filtro defensivo.
const pqrWithoutCoords = {
  ...basePQR,
  id: 'pqr-2',
  type: 'COMPLAINT',
  status: 'RESOLVED',
  latitude: null,
  longitude: null,
} as unknown as MapPQR;

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    React.createElement(QueryClientProvider, { client: queryClient }, ui),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (apiClient.get as jest.Mock).mockResolvedValue({
    data: [basePQR, pqrWithoutCoords],
  });
});

describe('MapScreen', () => {
  it('muestra el título "Mapa ciudadano"', async () => {
    const { getByText } = renderWithQuery(<MapScreen />);
    expect(getByText('Mapa ciudadano')).toBeTruthy();
  });

  it('renderiza el mapa', async () => {
    const { getByTestId } = renderWithQuery(<MapScreen />);
    expect(getByTestId('map-view')).toBeTruthy();
  });

  it('solo pone marcador en las PQRSD que tienen coordenadas', async () => {
    const { getAllByTestId } = renderWithQuery(<MapScreen />);
    await waitFor(() => {
      expect(getAllByTestId('map-marker')).toHaveLength(1);
    });
  });

  it('muestra el contador de ubicaciones', async () => {
    const { getByText } = renderWithQuery(<MapScreen />);
    await waitFor(() => {
      expect(getByText('1 ubicación')).toBeTruthy();
    });
  });

  it('renderiza los chips de tipo', () => {
    const { getByText } = renderWithQuery(<MapScreen />);
    expect(getByText('Petición')).toBeTruthy();
    expect(getByText('Queja')).toBeTruthy();
  });

  it('renderiza los chips de estado', () => {
    const { getByText } = renderWithQuery(<MapScreen />);
    expect(getByText('Pendiente')).toBeTruthy();
    expect(getByText('Resuelto')).toBeTruthy();
  });

  it('chip de tipo activo filtra los marcadores', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [
        basePQR,
        { ...basePQR, id: 'pqr-3', type: 'COMPLAINT', latitude: 5.0, longitude: -75.0 },
      ],
    });

    const { getAllByText, getAllByTestId } = renderWithQuery(<MapScreen />);

    await waitFor(() => expect(getAllByTestId('map-marker')).toHaveLength(2));

    // The first "Petición" is the filter chip (rendered before the callouts).
    fireEvent.press(getAllByText('Petición')[0]);

    await waitFor(() => expect(getAllByTestId('map-marker')).toHaveLength(1));
  });

  it('chip de tipo se deselecciona al presionarlo de nuevo', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [
        basePQR,
        { ...basePQR, id: 'pqr-3', type: 'COMPLAINT', latitude: 5.0, longitude: -75.0 },
      ],
    });

    const { getAllByText, getAllByTestId } = renderWithQuery(<MapScreen />);

    await waitFor(() => expect(getAllByTestId('map-marker')).toHaveLength(2));

    fireEvent.press(getAllByText('Petición')[0]);
    await waitFor(() => expect(getAllByTestId('map-marker')).toHaveLength(1));

    fireEvent.press(getAllByText('Petición')[0]);
    await waitFor(() => expect(getAllByTestId('map-marker')).toHaveLength(2));
  });

  it('"Limpiar" aparece cuando hay filtro activo', async () => {
    const { getByText, queryByText } = renderWithQuery(<MapScreen />);

    expect(queryByText('Limpiar')).toBeNull();

    fireEvent.press(getByText('Petición'));

    await waitFor(() => expect(getByText('Limpiar')).toBeTruthy());
  });

  it('"Limpiar" elimina todos los filtros', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [
        basePQR,
        { ...basePQR, id: 'pqr-3', type: 'COMPLAINT', latitude: 5.0, longitude: -75.0 },
      ],
    });

    const { getByText, getAllByText, getAllByTestId, queryByText } = renderWithQuery(<MapScreen />);

    await waitFor(() => expect(getAllByTestId('map-marker')).toHaveLength(2));

    fireEvent.press(getAllByText('Petición')[0]);
    await waitFor(() => expect(getAllByTestId('map-marker')).toHaveLength(1));

    fireEvent.press(getByText('Limpiar'));
    await waitFor(() => expect(getAllByTestId('map-marker')).toHaveLength(2));
    expect(queryByText('Limpiar')).toBeNull();
  });

  it('pide GET /pqr/map, sin el limit del muro', async () => {
    renderWithQuery(<MapScreen />);
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());

    const [url, config] = (apiClient.get as jest.Mock).mock.calls[0];
    expect(url).toBe(ENDPOINTS.PQR.MAP);
    expect(url).toBe('/pqr/map');
    expect(config?.params?.limit).toBeUndefined();
  });

  it('lee el array pelado de /pqr/map (sin envoltorio { pqrs })', async () => {
    const { getAllByTestId } = renderWithQuery(<MapScreen />);
    await waitFor(() => expect(getAllByTestId('map-marker')).toHaveLength(1));
  });

  it('no rompe si la respuesta no es un array', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { pqrs: [basePQR] } });

    const { getByTestId, queryAllByTestId, queryByText } = renderWithQuery(<MapScreen />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(getByTestId('map-view')).toBeTruthy();
    expect(queryAllByTestId('map-marker')).toHaveLength(0);
    expect(queryByText('Error al cargar los datos')).toBeNull();
  });

  it('pinta más de 50 marcadores (el tope viejo del muro)', async () => {
    const many: MapPQR[] = Array.from({ length: 120 }, (_, i) => ({
      ...basePQR,
      id: `pqr-${i}`,
      latitude: 4.7 + i * 0.001,
      longitude: -74.07 + i * 0.001,
    }));
    (apiClient.get as jest.Mock).mockResolvedValue({ data: many });

    const { getAllByTestId, getByText } = renderWithQuery(<MapScreen />);

    await waitFor(() => expect(getAllByTestId('map-marker')).toHaveLength(120));
    // Matcher laxo a propósito: el plural del contador viene mal escrito de
    // antes ("ubicaciónes") y este test no debe fijar esa errata.
    expect(getByText(/^120 ubicaci/)).toBeTruthy();
  });

  it('muestra los datos de la PQRSD al tocar el marcador', async () => {
    const { getByText, getByTestId } = renderWithQuery(<MapScreen />);
    await waitFor(() => expect(getByTestId('map-marker')).toBeTruthy());

    fireEvent.press(getByTestId('map-marker'));

    await waitFor(() => {
      expect(getByText('Problema de agua')).toBeTruthy();
      expect(getByText('Alcaldía de Bogotá')).toBeTruthy();
      expect(getByText('Ana Ruiz')).toBeTruthy();
    });
  });

  it('rotula "Anónimo" cuando el servidor anula creator (H-18)', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [{ ...basePQR, anonymous: true, creatorId: null, creator: null }],
    });

    const { getByText, getByTestId, queryByText } = renderWithQuery(<MapScreen />);
    await waitFor(() => expect(getByTestId('map-marker')).toBeTruthy());

    fireEvent.press(getByTestId('map-marker'));

    await waitFor(() => expect(getByText('Anónimo')).toBeTruthy());
    expect(queryByText('Ana Ruiz')).toBeNull();
  });
});

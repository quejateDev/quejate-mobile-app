import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MapScreen from '../MapScreen';
import { apiClient } from '@core/api/client';
import type { PQRS } from '@core/types';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((cb: () => void) => cb()),
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
  const Marker = ({ children }: any) =>
    React.createElement(View, { testID: 'map-marker' }, children);
  const Callout = ({ children }: any) =>
    React.createElement(View, null, children);

  return { __esModule: true, default: MapView, Marker, Callout };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

const basePQR: PQRS = {
  id: 'pqr-1',
  consecutiveCode: 'PQR-001',
  type: 'PETITION',
  status: 'PENDING',
  subject: 'Problema de agua',
  description: undefined,
  anonymous: false,
  private: false,
  entityId: 'e1',
  latitude: 4.711,
  longitude: -74.0721,
  guestName: undefined,
  guestEmail: undefined,
  guestPhone: undefined,
  dueDate: new Date('2024-03-01'),
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  entity: { id: 'e1', name: 'Alcaldía de Bogotá' },
  department: null,
  attachments: [],
  comments: [],
  likes: [],
  customFieldValues: [],
};

const pqrWithoutCoords: PQRS = {
  ...basePQR,
  id: 'pqr-2',
  type: 'COMPLAINT',
  status: 'RESOLVED',
  latitude: null,
  longitude: null,
};

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
    data: { pqrs: [basePQR, pqrWithoutCoords] },
  });
});

describe('MapScreen', () => {
  it('muestra el título "Mapa de PQRSDs"', async () => {
    const { getByText } = renderWithQuery(<MapScreen />);
    expect(getByText('Mapa de PQRSDs')).toBeTruthy();
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
      data: {
        pqrs: [
          basePQR,
          { ...basePQR, id: 'pqr-3', type: 'COMPLAINT', latitude: 5.0, longitude: -75.0 },
        ],
      },
    });

    const { getByText, getAllByTestId } = renderWithQuery(<MapScreen />);

    await waitFor(() => expect(getAllByTestId('map-marker')).toHaveLength(2));

    fireEvent.press(getByText('Petición'));

    await waitFor(() => expect(getAllByTestId('map-marker')).toHaveLength(1));
  });

  it('chip de tipo se deselecciona al presionarlo de nuevo', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        pqrs: [
          basePQR,
          { ...basePQR, id: 'pqr-3', type: 'COMPLAINT', latitude: 5.0, longitude: -75.0 },
        ],
      },
    });

    const { getByText, getAllByTestId } = renderWithQuery(<MapScreen />);

    await waitFor(() => expect(getAllByTestId('map-marker')).toHaveLength(2));

    fireEvent.press(getByText('Petición'));
    await waitFor(() => expect(getAllByTestId('map-marker')).toHaveLength(1));

    fireEvent.press(getByText('Petición'));
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
      data: {
        pqrs: [
          basePQR,
          { ...basePQR, id: 'pqr-3', type: 'COMPLAINT', latitude: 5.0, longitude: -75.0 },
        ],
      },
    });

    const { getByText, getAllByTestId, queryByText } = renderWithQuery(<MapScreen />);

    await waitFor(() => expect(getAllByTestId('map-marker')).toHaveLength(2));

    fireEvent.press(getByText('Petición'));
    await waitFor(() => expect(getAllByTestId('map-marker')).toHaveLength(1));

    fireEvent.press(getByText('Limpiar'));
    await waitFor(() => expect(getAllByTestId('map-marker')).toHaveLength(2));
    expect(queryByText('Limpiar')).toBeNull();
  });

  it('llama a GET /api/pqr con limit=50', async () => {
    renderWithQuery(<MapScreen />);
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const [, config] = (apiClient.get as jest.Mock).mock.calls[0];
    expect(config?.params?.limit).toBe(50);
  });

  it('muestra los datos en el callout del marcador', async () => {
    const { getByText } = renderWithQuery(<MapScreen />);
    await waitFor(() => {
      expect(getByText('Problema de agua')).toBeTruthy();
      expect(getByText('Alcaldía de Bogotá')).toBeTruthy();
    });
  });
});

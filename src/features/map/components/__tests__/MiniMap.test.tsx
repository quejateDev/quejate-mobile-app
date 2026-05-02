import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MiniMap } from '../MiniMap';
import * as Location from 'expo-location';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View, TouchableOpacity } = require('react-native');

  const MapView = React.forwardRef(({ children, onPress }: any, _ref: any) =>
    React.createElement(
      View,
      { testID: 'map-view' },
      React.createElement(TouchableOpacity, {
        testID: 'map-tap-area',
        onPress: () =>
          onPress?.({
            nativeEvent: { coordinate: { latitude: 4.711, longitude: -74.0721 } },
          }),
      }),
      children,
    ),
  );

  const Marker = () => React.createElement(View, { testID: 'map-marker' });

  return { __esModule: true, default: MapView, Marker };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
    status: 'granted',
  });
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
    coords: { latitude: 4.711, longitude: -74.0721 },
  });
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ display_name: 'Bogotá, Colombia' }),
  });
});

describe('MiniMap', () => {
  it('renderiza el mapa y el botón Mi ubicación', () => {
    const { getByTestId, getByText } = render(
      <MiniMap latitude={null} longitude={null} onLocationChange={jest.fn()} />,
    );
    expect(getByTestId('map-view')).toBeTruthy();
    expect(getByText('Mi ubicación')).toBeTruthy();
  });

  it('no muestra "Quitar pin" cuando no hay pin', () => {
    const { queryByText } = render(
      <MiniMap latitude={null} longitude={null} onLocationChange={jest.fn()} />,
    );
    expect(queryByText('Quitar pin')).toBeNull();
  });

  it('muestra "Quitar pin" y el marcador cuando hay coordenadas', () => {
    const { getByText, getByTestId } = render(
      <MiniMap latitude={4.711} longitude={-74.0721} onLocationChange={jest.fn()} />,
    );
    expect(getByText('Quitar pin')).toBeTruthy();
    expect(getByTestId('map-marker')).toBeTruthy();
  });

  it('tocar el mapa llama onLocationChange con coordenadas y dirección', async () => {
    const onLocationChange = jest.fn();
    const { getByTestId } = render(
      <MiniMap latitude={null} longitude={null} onLocationChange={onLocationChange} />,
    );

    fireEvent.press(getByTestId('map-tap-area'));

    await waitFor(() => {
      expect(onLocationChange).toHaveBeenCalledWith(4.711, -74.0721, 'Bogotá, Colombia');
    });
  });

  it('tocar el mapa muestra "Obteniendo dirección…" mientras geocodifica', async () => {
    let resolveGeocode!: (val: any) => void;
    mockFetch.mockReturnValue(
      new Promise((res) => {
        resolveGeocode = res;
      }),
    );

    const { getByTestId, getByText, queryByText } = render(
      <MiniMap latitude={null} longitude={null} onLocationChange={jest.fn()} />,
    );

    fireEvent.press(getByTestId('map-tap-area'));

    await waitFor(() => expect(getByText('Obteniendo dirección…')).toBeTruthy());

    resolveGeocode({
      ok: true,
      json: async () => ({ display_name: 'Bogotá' }),
    });

    await waitFor(() => expect(queryByText('Obteniendo dirección…')).toBeNull());
  });

  it('"Mi ubicación" solicita permiso, obtiene posición y llama onLocationChange', async () => {
    const onLocationChange = jest.fn();
    const { getByText } = render(
      <MiniMap latitude={null} longitude={null} onLocationChange={onLocationChange} />,
    );

    fireEvent.press(getByText('Mi ubicación'));

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
      expect(onLocationChange).toHaveBeenCalledWith(4.711, -74.0721, 'Bogotá, Colombia');
    });
  });

  it('"Mi ubicación" no avanza si el permiso es denegado', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });
    const onLocationChange = jest.fn();
    const { getByText } = render(
      <MiniMap latitude={null} longitude={null} onLocationChange={onLocationChange} />,
    );

    fireEvent.press(getByText('Mi ubicación'));

    await waitFor(() =>
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled(),
    );
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
    expect(onLocationChange).not.toHaveBeenCalled();
  });

  it('"Quitar pin" limpia la ubicación y llama onLocationChange(null, null, null)', () => {
    const onLocationChange = jest.fn();
    const { getByText } = render(
      <MiniMap latitude={4.711} longitude={-74.0721} onLocationChange={onLocationChange} />,
    );

    fireEvent.press(getByText('Quitar pin'));

    expect(onLocationChange).toHaveBeenCalledWith(null, null, null);
  });

  it('cuando la geocodificación falla llama onLocationChange sin dirección', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const onLocationChange = jest.fn();
    const { getByTestId } = render(
      <MiniMap latitude={null} longitude={null} onLocationChange={onLocationChange} />,
    );

    fireEvent.press(getByTestId('map-tap-area'));

    await waitFor(() => {
      expect(onLocationChange).toHaveBeenCalledWith(4.711, -74.0721, null);
    });
  });
});

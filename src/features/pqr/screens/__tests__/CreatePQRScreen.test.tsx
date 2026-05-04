import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CreatePQRScreen from '../CreatePQRScreen';

jest.mock('@core/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('react-native-recaptcha-that-works', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Recaptcha = React.forwardRef((_: any, __: any) =>
    React.createElement(View, { testID: 'recaptcha' }),
  );
  return { __esModule: true, default: Recaptcha };
});

jest.mock('@core/auth/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions: { All: 'All' },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));

jest.mock('@features/pqr/hooks/useLocations', () => ({
  useDepartments: jest.fn(),
  useMunicipalities: jest.fn(),
}));

jest.mock('@features/pqr/hooks/useEntities', () => ({
  useEntities: jest.fn(),
}));

jest.mock('@features/pqr/hooks/usePQRConfig', () => ({
  usePQRConfig: jest.fn(),
}));

jest.mock('@features/pqr/hooks/useCreatePQR', () => ({
  useCreatePQR: jest.fn(),
}));

jest.mock('@features/map/components/MiniMap', () => {
  const React = require('react');
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    MiniMap: ({ onLocationChange }: { onLocationChange: (lat: number | null, lng: number | null, addr: string | null) => void }) =>
      React.createElement(
        View,
        { testID: 'mini-map' },
        React.createElement(
          TouchableOpacity,
          {
            testID: 'map-set-location',
            onPress: () => onLocationChange(4.711, -74.0721, 'Bogotá, Colombia'),
          },
          React.createElement(Text, null, 'Fijar ubicación'),
        ),
      ),
  };
});

import { useAuth } from '@core/auth/useAuth';
import { useDepartments, useMunicipalities } from '@features/pqr/hooks/useLocations';
import { useEntities } from '@features/pqr/hooks/useEntities';
import { usePQRConfig } from '@features/pqr/hooks/usePQRConfig';
import { useCreatePQR } from '@features/pqr/hooks/useCreatePQR';

const basePqrConfig = {
  id: 'cfg-1',
  allowAnonymous: true,
  requireEvidence: false,
  maxResponseTime: 15,
  notifyEmail: false,
  autoAssign: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  customFields: [],
};

const mockCreatePQR = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();

  (useAuth as unknown as jest.Mock).mockReturnValue({
    user: { id: 'user-1', name: 'Test User' },
  });
  (useDepartments as jest.Mock).mockReturnValue({
    departments: [{ id: 'd1', name: 'Cundinamarca' }],
    isLoading: false,
  });
  (useMunicipalities as jest.Mock).mockReturnValue({
    municipalities: [{ id: 'm1', name: 'Bogotá' }],
    isLoading: false,
  });
  (useEntities as jest.Mock).mockReturnValue({
    entities: [{ id: 'e1', name: 'Alcaldía de Bogotá' }],
    isLoading: false,
  });
  (usePQRConfig as jest.Mock).mockReturnValue({
    pqrConfig: basePqrConfig,
    entityDepartments: [],
    isLoading: false,
  });
  (useCreatePQR as jest.Mock).mockReturnValue({
    createPQR: mockCreatePQR,
    isPending: false,
  });
  mockCreatePQR.mockResolvedValue({ consecutiveCode: 'PQR-20240101-001' });
});

type RenderResult = ReturnType<typeof render>;

async function navigateToStep2(utils: RenderResult) {
  const { getByTestId, getByText } = utils;

  fireEvent.press(getByTestId('dept-selector'));
  await waitFor(() => getByTestId('dept-option-d1'));
  fireEvent.press(getByTestId('dept-option-d1'));

  fireEvent.press(getByTestId('entity-selector'));
  await waitFor(() => getByTestId('entity-option-e1'));
  fireEvent.press(getByTestId('entity-option-e1'));

  fireEvent.press(getByText('Siguiente'));
  await waitFor(() => getByTestId('step2-content'));
}

async function navigateToStep3(utils: RenderResult) {
  await navigateToStep2(utils);
  const { getByTestId, getByText } = utils;
  fireEvent.press(getByTestId('type-option-PETITION'));
  fireEvent.press(getByText('Siguiente'));
  await waitFor(() => getByTestId('step3-content'));
}

async function navigateToStep4(utils: RenderResult) {
  await navigateToStep3(utils);
  fireEvent.press(utils.getByText('Siguiente'));
  await waitFor(() => utils.getByTestId('step4-content'));
}

async function navigateToStep5(utils: RenderResult) {
  await navigateToStep4(utils);
  fireEvent.press(utils.getByText('Siguiente'));
  await waitFor(() => utils.getByTestId('step5-content'));
}

describe('CreatePQRScreen — customFields visibilidad', () => {
  it('muestra campo isForAnonymous=true y oculta isForAnonymous=false cuando isAnonymous=true', async () => {
    (usePQRConfig as jest.Mock).mockReturnValue({
      pqrConfig: {
        ...basePqrConfig,
        customFields: [
          {
            id: 'cf1',
            name: 'Número de radicado',
            type: 'text',
            required: false,
            isForAnonymous: false,
            placeholder: '',
          },
          {
            id: 'cf2',
            name: 'Correo de contacto',
            type: 'text',
            required: false,
            isForAnonymous: true,
            placeholder: '',
          },
        ],
      },
      entityDepartments: [],
      isLoading: false,
    });

    const utils = render(<CreatePQRScreen />);
    const { getByTestId, getByText, queryByTestId } = utils;

    await navigateToStep2(utils);

    fireEvent(getByTestId('anonymous-toggle'), 'valueChange', true);

    fireEvent.press(getByTestId('type-option-PETITION'));
    fireEvent.press(getByText('Siguiente'));
    await waitFor(() => getByTestId('step3-content'));

    expect(getByTestId('custom-field-Correo de contacto')).toBeTruthy();
    expect(queryByTestId('custom-field-Número de radicado')).toBeNull();
  });
});

describe('CreatePQRScreen — allowAnonymous', () => {
  it('deshabilita el toggle anónimo cuando la entidad no permite envíos anónimos', async () => {
    (usePQRConfig as jest.Mock).mockReturnValue({
      pqrConfig: { ...basePqrConfig, allowAnonymous: false },
      entityDepartments: [],
      isLoading: false,
    });

    const utils = render(<CreatePQRScreen />);
    const { getByTestId } = utils;

    await navigateToStep2(utils);

    const toggle = getByTestId('anonymous-toggle');
    expect(toggle.props.disabled).toBe(true);
  });

  it('habilita el toggle anónimo cuando la entidad permite envíos anónimos', async () => {
    const utils = render(<CreatePQRScreen />);
    const { getByTestId } = utils;

    await navigateToStep2(utils);

    const toggle = getByTestId('anonymous-toggle');
    expect(toggle.props.disabled).toBeFalsy();
  });
});

describe('CreatePQRScreen — requireEvidence', () => {
  it('bloquea el avance al step 4 y muestra error si requireEvidence=true sin adjuntos', async () => {
    (usePQRConfig as jest.Mock).mockReturnValue({
      pqrConfig: { ...basePqrConfig, requireEvidence: true },
      entityDepartments: [],
      isLoading: false,
    });

    const utils = render(<CreatePQRScreen />);
    const { getByText, queryByTestId } = utils;

    await navigateToStep3(utils);

    fireEvent.press(getByText('Siguiente'));

    await waitFor(() => {
      expect(
        getByText('Debes adjuntar al menos un archivo de evidencia'),
      ).toBeTruthy();
    });

    expect(queryByTestId('step4-content')).toBeNull();
  });

  it('permite avanzar al step 4 cuando requireEvidence=false sin adjuntos', async () => {
    const utils = render(<CreatePQRScreen />);
    const { getByText, getByTestId } = utils;

    await navigateToStep3(utils);

    fireEvent.press(getByText('Siguiente'));
    await waitFor(() => getByTestId('step4-content'));

    expect(getByTestId('step4-content')).toBeTruthy();
  });
});

describe('CreatePQRScreen — paso 4 (mapa)', () => {
  it('muestra el MiniMap en el paso 4', async () => {
    const utils = render(<CreatePQRScreen />);
    await navigateToStep4(utils);
    fireEvent.press(utils.getByText('Seleccionar en mapa'));
    await waitFor(() => utils.getByTestId('mini-map'));
    expect(utils.getByTestId('mini-map')).toBeTruthy();
  });

  it('el paso 4 es opcional — se puede avanzar sin fijar ubicación', async () => {
    const utils = render(<CreatePQRScreen />);
    await navigateToStep4(utils);
    fireEvent.press(utils.getByText('Siguiente'));
    await waitFor(() => utils.getByTestId('step5-content'));
    expect(utils.getByTestId('step5-content')).toBeTruthy();
  });

  it('mostrar dirección seleccionada debajo del mapa al fijar pin', async () => {
    const utils = render(<CreatePQRScreen />);
    await navigateToStep4(utils);

    fireEvent.press(utils.getByText('Seleccionar en mapa'));
    await waitFor(() => utils.getByTestId('map-set-location'));
    fireEvent.press(utils.getByTestId('map-set-location'));

    await waitFor(() => {
      expect(utils.getByText(/Bogotá, Colombia/)).toBeTruthy();
    });
  });
});

describe('CreatePQRScreen — paso 5 (confirmación)', () => {
  it('muestra el resumen con los datos del formulario', async () => {
    const utils = render(<CreatePQRScreen />);
    await navigateToStep5(utils);

    expect(utils.getByText('Paso 5 — Confirmación')).toBeTruthy();
    expect(utils.getByText('Alcaldía de Bogotá')).toBeTruthy();
  });

  it('muestra la ubicación en el resumen cuando se fijó un pin', async () => {
    const utils = render(<CreatePQRScreen />);
    await navigateToStep4(utils);

    fireEvent.press(utils.getByText('Seleccionar en mapa'));
    await waitFor(() => utils.getByTestId('map-set-location'));
    fireEvent.press(utils.getByTestId('map-set-location'));
    await waitFor(() => utils.getByText(/Bogotá, Colombia/));

    fireEvent.press(utils.getByText('Siguiente'));
    await waitFor(() => utils.getByTestId('step5-content'));

    expect(utils.getByText('Ubicación')).toBeTruthy();
    expect(utils.getAllByText(/Bogotá, Colombia/).length).toBeGreaterThan(0);
  });

  it('no muestra fila de ubicación en el resumen si no se fijó pin', async () => {
    const utils = render(<CreatePQRScreen />);
    await navigateToStep5(utils);

    expect(utils.queryByText('Ubicación')).toBeNull();
  });

  it('el botón Enviar está deshabilitado sin reCAPTCHA', async () => {
    const utils = render(<CreatePQRScreen />);
    await navigateToStep5(utils);

    const submitBtn = utils.getByTestId('submit-btn');
    expect(submitBtn.props.accessibilityState?.disabled ?? submitBtn.props.disabled).toBeTruthy();
  });
});

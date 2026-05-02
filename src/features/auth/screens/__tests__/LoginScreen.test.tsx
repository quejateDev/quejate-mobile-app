import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';
import { useAuth } from '@core/auth/useAuth';
import * as WebBrowser from 'expo-web-browser';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('@features/auth/hooks/useGoogleAuth', () => ({
  useGoogleAuth: () => ({
    signInWithGoogle: jest.fn(),
    isPending: false,
    error: null,
  }),
}));

jest.mock('@core/auth/useAuth');
jest.mock('@core/api/client', () => ({
  apiClient: { get: jest.fn() },
  extractSessionToken: jest.fn(),
}));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

const mockSignIn = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useAuth as unknown as jest.Mock).mockReturnValue({
    signInWithCredentials: mockSignIn,
  });
});

describe('LoginScreen', () => {
  it('render: muestra campos email y password', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText('tu@correo.com')).toBeTruthy();
    expect(getByPlaceholderText('••••••')).toBeTruthy();
  });

  it('validación: error si email inválido al submit', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('tu@correo.com'), 'no-es-email');
    fireEvent.changeText(getByPlaceholderText('••••••'), 'password123');
    fireEvent.press(getByText('Iniciar sesión'));

    await waitFor(() => {
      expect(getByText('Email inválido')).toBeTruthy();
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('validación: error si password vacío al submit', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('tu@correo.com'), 'test@test.com');
    fireEvent.press(getByText('Iniciar sesión'));

    await waitFor(() => {
      expect(getByText('Mínimo 6 caracteres')).toBeTruthy();
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('submit: llama signInWithCredentials con los valores del formulario', async () => {
    mockSignIn.mockResolvedValue(undefined);
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('tu@correo.com'), 'user@test.com');
    fireEvent.changeText(getByPlaceholderText('••••••'), 'pass123');
    fireEvent.press(getByText('Iniciar sesión'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('user@test.com', 'pass123');
    });
  });

  it('loading: botón deshabilitado durante el sign in', async () => {
    let resolveSignIn!: () => void;
    mockSignIn.mockImplementation(
      () => new Promise<void>((resolve) => { resolveSignIn = resolve; })
    );

    const { queryByText, getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('tu@correo.com'), 'user@test.com');
    fireEvent.changeText(getByPlaceholderText('••••••'), 'pass123');
    fireEvent.press(getByText('Iniciar sesión'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
      expect(queryByText('Iniciar sesión')).toBeNull();
    });

    resolveSignIn();
  });

  it('error: muestra mensaje cuando signInWithCredentials rechaza', async () => {
    mockSignIn.mockRejectedValue(new Error('INVALID_CREDENTIALS'));
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('tu@correo.com'), 'user@test.com');
    fireEvent.changeText(getByPlaceholderText('••••••'), 'pass123');
    fireEvent.press(getByText('Iniciar sesión'));

    await waitFor(() => {
      expect(getByText('Email o contraseña incorrectos')).toBeTruthy();
    });
  });
});

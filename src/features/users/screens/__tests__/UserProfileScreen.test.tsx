import React from 'react';
import { render, screen } from '@testing-library/react-native';
import UserProfileScreen from '../UserProfileScreen';

const appConfig = require('../../../../../app.config.js') as { expo: { version: string } };

// En el binario, `Constants.expoConfig` es la configuración de app.config.js
// que EAS mete en la compilación. En Jest llega vacía, así que se le da aquí
// la de verdad, o la que cada prueba necesite. Va con un getter porque el
// módulo se carga antes de que exista `mockConstants`.
const mockConstants: { expoConfig: { version?: string } | null } = { expoConfig: null };
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockConstants.expoConfig;
    },
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => children ?? null,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@core/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Juan García', email: 'juan@example.com', role: 'CLIENT' },
    signOut: jest.fn(),
  }),
}));

jest.mock('@features/users/hooks/useProfileActions', () => {
  const mutation = { isPending: false, mutate: jest.fn() };
  return {
    useProfileActions: () => ({
      profile: undefined,
      isProfileError: false,
      refetchProfile: jest.fn(),
      updateMutation: mutation,
      changePasswordMutation: mutation,
      deleteAccountMutation: mutation,
    }),
  };
});

// Importa react-native-webview, que en Jest revienta al cargarse.
jest.mock('@features/users/components/profile/WebViewModal', () => ({
  WebViewModal: () => null,
}));

describe('UserProfileScreen: versión en el pie', () => {
  it('enseña la versión de app.config.js', () => {
    mockConstants.expoConfig = appConfig.expo;

    render(<UserProfileScreen />);

    expect(screen.getByText(`Quéjate v${appConfig.expo.version}`)).toBeTruthy();
  });

  // Mejor nada que un número que no es el de la compilación.
  it.each([
    ['sin configuración', null],
    ['con la configuración sin versión', {}],
    ['con la versión vacía', { version: '' }],
  ])('no enseña ninguna versión %s', (_case, expoConfig) => {
    mockConstants.expoConfig = expoConfig;

    render(<UserProfileScreen />);

    expect(screen.queryByText(/^Quéjate v/)).toBeNull();
  });
});

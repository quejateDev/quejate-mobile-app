import { useAuth } from '../useAuth';
import { SecureStorage } from '@core/auth/SecureStorage';
import { apiClient, extractSessionToken } from '@core/api/client';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { SessionUser } from '@core/types';

jest.mock('@core/auth/SecureStorage', () => ({
  SecureStorage: {
    getSessionToken: jest.fn(),
    setSessionToken: jest.fn(),
    removeSessionToken: jest.fn(),
  },
  SESSION_TOKEN_KEY: 'authjs.session-token',
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { signOut: jest.fn() },
}));

jest.mock('@core/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
  extractSessionToken: jest.fn(),
  extractCsrfCookie: jest.fn(() => 'authjs.csrf-token=testvalue'),
}));

const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

const mockUser: SessionUser = {
  id: '1',
  name: 'Test User',
  email: 'test@test.com',
  image: null,
  role: 'CLIENT',
  isOAuth: false,
};

function makeCsrfResponse(cookie = 'csrfcookie=abc') {
  return {
    json: async () => ({ csrfToken: 'csrf-token-123' }),
    headers: {
      get: (header: string) => (header === 'set-cookie' ? cookie : null),
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (GoogleSignin.signOut as jest.Mock).mockResolvedValue(undefined);
  useAuth.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  });
});

describe('signInWithCredentials', () => {
  it('exitoso con user en respuesta → guarda token, setea user directamente', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { sessionToken: 'tok123', user: mockUser },
    });
    (SecureStorage.setSessionToken as jest.Mock).mockResolvedValue(undefined);

    await useAuth.getState().signInWithCredentials('test@test.com', 'pass123');

    expect(SecureStorage.setSessionToken).toHaveBeenCalledWith('tok123');
    expect(apiClient.get).not.toHaveBeenCalled();
    const state = useAuth.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('respuesta sin user → hace GET /session como fallback', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { sessionToken: 'tok123' } });
    (SecureStorage.setSessionToken as jest.Mock).mockResolvedValue(undefined);
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    await useAuth.getState().signInWithCredentials('test@test.com', 'pass123');

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    const state = useAuth.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('SESSION_INVALID cuando el fallback no devuelve user', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { sessionToken: 'tok123' } });
    (SecureStorage.setSessionToken as jest.Mock).mockResolvedValue(undefined);
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { user: null } });

    await expect(
      useAuth.getState().signInWithCredentials('test@test.com', 'pass123'),
    ).rejects.toThrow('SESSION_INVALID');

    expect(useAuth.getState().user).toBeNull();
    expect(useAuth.getState().isAuthenticated).toBe(false);
  });
});

describe('signInWithGoogle', () => {
  it('respuesta con user → usa user directamente sin llamar GET /session', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { sessionToken: 'google-tok', user: mockUser },
    });
    (SecureStorage.setSessionToken as jest.Mock).mockResolvedValue(undefined);

    await useAuth.getState().signInWithGoogle('google-id-token');

    expect(SecureStorage.setSessionToken).toHaveBeenCalledWith('google-tok');
    expect(apiClient.get).not.toHaveBeenCalled();
    const state = useAuth.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('respuesta sin user → hace GET /session como fallback', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { sessionToken: 'google-tok' },
    });
    (SecureStorage.setSessionToken as jest.Mock).mockResolvedValue(undefined);
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    await useAuth.getState().signInWithGoogle('google-id-token');

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    const state = useAuth.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('SESSION_INVALID cuando el fallback no devuelve user', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { sessionToken: 'google-tok' },
    });
    (SecureStorage.setSessionToken as jest.Mock).mockResolvedValue(undefined);
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { user: null } });

    await expect(
      useAuth.getState().signInWithGoogle('google-id-token'),
    ).rejects.toThrow('SESSION_INVALID');

    expect(useAuth.getState().user).toBeNull();
    expect(useAuth.getState().isAuthenticated).toBe(false);
  });
});

describe('signOut', () => {
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  });

  it('exitoso → token eliminado, user=null, isAuthenticated=false', async () => {
    useAuth.setState({ user: mockUser, isAuthenticated: true, isLoading: false });

    (SecureStorage.getSessionToken as jest.Mock).mockResolvedValue('tok123');
    (SecureStorage.removeSessionToken as jest.Mock).mockResolvedValue(undefined);

    mockFetch
      .mockResolvedValueOnce(makeCsrfResponse())
      .mockResolvedValueOnce({ json: async () => ({}), headers: { get: () => null } });

    await useAuth.getState().signOut();

    expect(SecureStorage.removeSessionToken).toHaveBeenCalled();
    const state = useAuth.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('arma el signout sobre EXPO_PUBLIC_API_URL sin romper el host api.*', async () => {
    // Regresión de Tarea 14: con `https://api.quejate.com.co/api`, el antiguo
    // `.replace('/api', '')` casaba con el `//api` del host y pegaba a
    // `https:/.quejate.com.co/api/api/auth/csrf`. El fetch fallaba en silencio
    // (va dentro de un try/catch), así que la sesión seguía viva en el servidor.
    process.env.EXPO_PUBLIC_API_URL = 'https://api.quejate.com.co/api';

    (SecureStorage.getSessionToken as jest.Mock).mockResolvedValue('tok123');
    (SecureStorage.removeSessionToken as jest.Mock).mockResolvedValue(undefined);

    mockFetch
      .mockResolvedValueOnce(makeCsrfResponse())
      .mockResolvedValueOnce({ json: async () => ({}), headers: { get: () => null } });

    await useAuth.getState().signOut();

    expect(mockFetch.mock.calls[0][0]).toBe('https://api.quejate.com.co/api/auth/csrf');
    expect(mockFetch.mock.calls[1][0]).toBe('https://api.quejate.com.co/api/auth/signout');
  });

  it('sigue armando las mismas URLs con el host antiguo', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://www.quejate.com.co/api';

    (SecureStorage.getSessionToken as jest.Mock).mockResolvedValue('tok123');
    (SecureStorage.removeSessionToken as jest.Mock).mockResolvedValue(undefined);

    mockFetch
      .mockResolvedValueOnce(makeCsrfResponse())
      .mockResolvedValueOnce({ json: async () => ({}), headers: { get: () => null } });

    await useAuth.getState().signOut();

    expect(mockFetch.mock.calls[0][0]).toBe('https://www.quejate.com.co/api/auth/csrf');
    expect(mockFetch.mock.calls[1][0]).toBe('https://www.quejate.com.co/api/auth/signout');
  });

  it('tolera una barra final en EXPO_PUBLIC_API_URL', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.quejate.com.co/api/';

    (SecureStorage.getSessionToken as jest.Mock).mockResolvedValue('tok123');
    (SecureStorage.removeSessionToken as jest.Mock).mockResolvedValue(undefined);

    mockFetch
      .mockResolvedValueOnce(makeCsrfResponse())
      .mockResolvedValueOnce({ json: async () => ({}), headers: { get: () => null } });

    await useAuth.getState().signOut();

    expect(mockFetch.mock.calls[0][0]).toBe('https://api.quejate.com.co/api/auth/csrf');
  });

  it('suelta la cuenta de Google para que reaparezca el selector', async () => {
    // Sin esto, el siguiente GoogleSignin.signIn() resuelve con la cuenta
    // cacheada sin enseñar el selector y no se puede cambiar de cuenta.
    (SecureStorage.getSessionToken as jest.Mock).mockResolvedValue('tok123');
    (SecureStorage.removeSessionToken as jest.Mock).mockResolvedValue(undefined);

    mockFetch
      .mockResolvedValueOnce(makeCsrfResponse())
      .mockResolvedValueOnce({ json: async () => ({}), headers: { get: () => null } });

    await useAuth.getState().signOut();

    expect(GoogleSignin.signOut).toHaveBeenCalledTimes(1);
  });

  it('suelta la cuenta de Google aunque la red falle después', async () => {
    (SecureStorage.getSessionToken as jest.Mock).mockResolvedValue('tok123');
    (SecureStorage.removeSessionToken as jest.Mock).mockResolvedValue(undefined);

    mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    await useAuth.getState().signOut();

    expect(GoogleSignin.signOut).toHaveBeenCalledTimes(1);
  });

  it('si el módulo nativo de Google falla, igual cierra la sesión', async () => {
    // Expo Go, o un teléfono sin sesión de Google: no debe impedir salir.
    useAuth.setState({ user: mockUser, isAuthenticated: true, isLoading: false });

    (GoogleSignin.signOut as jest.Mock).mockRejectedValue(new Error('RNGoogleSignin is null'));
    (SecureStorage.getSessionToken as jest.Mock).mockResolvedValue('tok123');
    (SecureStorage.removeSessionToken as jest.Mock).mockResolvedValue(undefined);

    mockFetch
      .mockResolvedValueOnce(makeCsrfResponse())
      .mockResolvedValueOnce({ json: async () => ({}), headers: { get: () => null } });

    await expect(useAuth.getState().signOut()).resolves.toBeUndefined();

    expect(SecureStorage.removeSessionToken).toHaveBeenCalled();
    const state = useAuth.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    // Y la sesión del servidor se sigue revocando pese al fallo nativo.
    expect(mockFetch.mock.calls[1][0]).toContain('/auth/signout');
  });

  it('con error de red → igual limpia el estado local', async () => {
    useAuth.setState({ user: mockUser, isAuthenticated: true, isLoading: false });

    (SecureStorage.getSessionToken as jest.Mock).mockResolvedValue('tok123');
    (SecureStorage.removeSessionToken as jest.Mock).mockResolvedValue(undefined);

    mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    await useAuth.getState().signOut();

    expect(SecureStorage.removeSessionToken).toHaveBeenCalled();
    const state = useAuth.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});

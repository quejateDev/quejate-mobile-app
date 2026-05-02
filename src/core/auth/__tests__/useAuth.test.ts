import { useAuth } from '../useAuth';
import { SecureStorage } from '@core/auth/SecureStorage';
import { apiClient, extractSessionToken } from '@core/api/client';
import { SessionUser } from '@core/types';

jest.mock('@core/auth/SecureStorage', () => ({
  SecureStorage: {
    getSessionToken: jest.fn(),
    setSessionToken: jest.fn(),
    removeSessionToken: jest.fn(),
  },
  SESSION_TOKEN_KEY: 'authjs.session-token',
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

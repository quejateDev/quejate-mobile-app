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
  it('exitoso → guarda token, setea user, isAuthenticated=true', async () => {
    mockFetch
      .mockResolvedValueOnce(makeCsrfResponse())
      .mockResolvedValueOnce({
        url: 'https://www.quejate.com.co/dashboard',
        headers: { get: (h: string) => (h === 'set-cookie' ? '__Secure-authjs.session-token=tok123' : null) },
      });

    (extractSessionToken as jest.Mock).mockReturnValue('tok123');
    (SecureStorage.setSessionToken as jest.Mock).mockResolvedValue(undefined);
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

    await useAuth.getState().signInWithCredentials('test@test.com', 'pass123');

    expect(SecureStorage.setSessionToken).toHaveBeenCalledWith('tok123');
    const state = useAuth.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('credenciales incorrectas → lanza INVALID_CREDENTIALS, user=null', async () => {
    mockFetch
      .mockResolvedValueOnce(makeCsrfResponse())
      .mockResolvedValueOnce({
        url: 'https://www.quejate.com.co/auth/login?error=CredentialsSignin&code=credentials',
        headers: { get: () => null },
      });

    (extractSessionToken as jest.Mock).mockReturnValue(null);

    await expect(
      useAuth.getState().signInWithCredentials('bad@test.com', 'wrongpass')
    ).rejects.toThrow('INVALID_CREDENTIALS');

    expect(useAuth.getState().user).toBeNull();
    expect(useAuth.getState().isAuthenticated).toBe(false);
  });

  it('email no verificado → lanza EMAIL_NOT_VERIFIED', async () => {
    mockFetch
      .mockResolvedValueOnce(makeCsrfResponse())
      .mockResolvedValueOnce({
        url: 'https://www.quejate.com.co/auth/login?error=AccessDenied',
        headers: { get: () => null },
      });

    (extractSessionToken as jest.Mock).mockReturnValue(null);

    await expect(
      useAuth.getState().signInWithCredentials('unverified@test.com', 'pass123')
    ).rejects.toThrow('EMAIL_NOT_VERIFIED');
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

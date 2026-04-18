import { create } from 'zustand';
import { SessionUser } from '@core/types';
import { SecureStorage, SESSION_TOKEN_KEY } from '@core/auth/SecureStorage';
import { apiClient, extractCsrfCookie } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';

interface SessionResponse {
  user: SessionUser | null;
}

interface AuthState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: SessionUser) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  signInWithCredentials: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) =>
    set({ user, isAuthenticated: true, isLoading: false }),

  clearUser: () =>
    set({ user: null, isAuthenticated: false, isLoading: false }),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  signInWithCredentials: async (email: string, password: string) => {
    const { setUser } = get();

    const res = await apiClient.post<{ sessionToken: string; user?: SessionUser }>(
      ENDPOINTS.AUTH.MOBILE_CREDENTIALS,
      { email, password },
    );
    const { sessionToken, user } = res.data;

    await SecureStorage.setSessionToken(sessionToken);

    if (user) {
      setUser(user);
      return;
    }

    // Fallback: consultar sesión si el backend no devuelve el usuario
    const sessionRes = await apiClient.get<SessionResponse>(ENDPOINTS.AUTH.SESSION);
    if (!sessionRes.data?.user) throw new Error('SESSION_INVALID');
    setUser(sessionRes.data.user);
  },

  signInWithGoogle: async (idToken: string) => {
    const { setUser } = get();

    const res = await apiClient.post<{ sessionToken: string }>(
      ENDPOINTS.AUTH.MOBILE_GOOGLE,
      { idToken },
    );
    const { sessionToken } = res.data;
    await SecureStorage.setSessionToken(sessionToken);

    const sessionRes = await apiClient.get<SessionResponse>(ENDPOINTS.AUTH.SESSION);
    if (!sessionRes.data?.user) throw new Error('SESSION_INVALID');
    setUser(sessionRes.data.user);
  },

  signOut: async () => {
    const { clearUser } = get();
    const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') ?? '';

    try {
      const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
      const { csrfToken } = await csrfRes.json();
      const csrfCookie = extractCsrfCookie(csrfRes.headers.get('set-cookie') ?? '');

      const sessionToken = await SecureStorage.getSessionToken();
      const cookieHeader = sessionToken
        ? `${csrfCookie}; ${SESSION_TOKEN_KEY}=${sessionToken}`
        : csrfCookie;

      await fetch(`${BASE_URL}/api/auth/signout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookieHeader,
        },
        body: new URLSearchParams({ csrfToken }).toString(),
      });
    } catch {
    }

    await SecureStorage.removeSessionToken();
    clearUser();
  },
}));

import { create } from 'zustand';
import { SessionUser } from '@core/types';
import { SecureStorage, SESSION_TOKEN_KEY } from '@core/auth/SecureStorage';
import { apiClient, extractSessionToken, extractCsrfCookie } from '@core/api/client';
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
    const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') ?? '';

    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json();
    const csrfCookie = extractCsrfCookie(csrfRes.headers.get('set-cookie') ?? '');

    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: csrfCookie,
      },
      body: new URLSearchParams({
        email,
        password,
        csrfToken,
        redirect: 'false',
        json: 'true',
      }).toString(),
    });

    const setCookie = loginRes.headers.get('set-cookie') ?? '';
    const token = extractSessionToken(setCookie);

    if (!token) {
      const errorParam = new URL(loginRes.url).searchParams.get('error');
      if (errorParam === 'AccessDenied') throw new Error('EMAIL_NOT_VERIFIED');
      throw new Error('INVALID_CREDENTIALS');
    }

    await SecureStorage.setSessionToken(token);
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

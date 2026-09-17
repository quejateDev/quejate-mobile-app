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

    const sessionRes = await apiClient.get<SessionResponse>(ENDPOINTS.AUTH.MOBILE_SESSION);
    if (!sessionRes.data?.user) throw new Error('SESSION_INVALID');
    setUser(sessionRes.data.user);
  },

  signInWithGoogle: async (idToken: string) => {
    const { setUser } = get();

    const res = await apiClient.post<{ sessionToken: string; user?: SessionUser }>(
      ENDPOINTS.AUTH.MOBILE_GOOGLE,
      { idToken },
    );
    const { sessionToken, user } = res.data;
    await SecureStorage.setSessionToken(sessionToken);

    if (user) {
      setUser(user);
      return;
    }

    const sessionRes = await apiClient.get<SessionResponse>(ENDPOINTS.AUTH.MOBILE_SESSION);
    if (!sessionRes.data?.user) throw new Error('SESSION_INVALID');
    setUser(sessionRes.data.user);
  },

  signOut: async () => {
    const { clearUser } = get();
    // Estas dos llamadas usan `fetch` y no `apiClient` porque necesitan leer
    // `set-cookie` y enviar la cabecera `Cookie`, que axios bloquea en RN.
    //
    // La URL se arma directamente sobre EXPO_PUBLIC_API_URL. NO se puede quitar
    // el sufijo con `.replace('/api', '')` y volver a añadirlo: en
    // `https://api.quejate.com.co/api` esa búsqueda casa primero con el `//api`
    // del host y deja `https:/.quejate.com.co/api`, una URL rota.
    const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

    const sessionToken = await SecureStorage.getSessionToken();

    await SecureStorage.removeSessionToken();
    clearUser();

    try {
      const csrfRes = await fetch(`${API_URL}${ENDPOINTS.AUTH.CSRF}`);
      const { csrfToken } = await csrfRes.json();
      const csrfCookie = extractCsrfCookie(csrfRes.headers.get('set-cookie') ?? '');

      const cookieHeader = sessionToken
        ? `${csrfCookie}; ${SESSION_TOKEN_KEY}=${sessionToken}`
        : csrfCookie;

      await fetch(`${API_URL}${ENDPOINTS.AUTH.SIGNOUT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookieHeader,
        },
        body: new URLSearchParams({ csrfToken }).toString(),
      });
    } catch {
    }
  },
}));

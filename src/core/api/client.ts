import axios from 'axios';
import { SecureStorage, SESSION_TOKEN_KEY } from '@core/auth/SecureStorage';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// REQUEST interceptor — attach session cookie on every request
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStorage.getSessionToken();
  if (token) {
    config.headers['Cookie'] = `${SESSION_TOKEN_KEY}=${token}`;
  }
  return config;
});

// RESPONSE interceptor — clear token on 401; redirect is handled by AuthProvider
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStorage.removeSessionToken();
    }
    return Promise.reject(error);
  },
);

/**
 * Extracts the session token value from a raw set-cookie header string.
 * Handles both dev (next-auth.session-token) and prod (__Secure-next-auth.session-token) names.
 */
export function extractSessionToken(setCookieHeader: string): string | null {
  const parts = setCookieHeader.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (
      trimmed.startsWith('next-auth.session-token=') ||
      trimmed.startsWith('__Secure-next-auth.session-token=')
    ) {
      const eqIndex = trimmed.indexOf('=');
      return trimmed.slice(eqIndex + 1);
    }
  }
  return null;
}

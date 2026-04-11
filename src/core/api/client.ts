import axios from 'axios';
import { SecureStorage, SESSION_TOKEN_KEY } from '@core/auth/SecureStorage';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStorage.getSessionToken();
  if (token) {
    config.headers['Cookie'] = `${SESSION_TOKEN_KEY}=${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStorage.removeSessionToken();
    }
    return Promise.reject(error);
  },
);

export function extractSessionToken(setCookieHeader: string): string | null {
  const segments = setCookieHeader.split(',');
  for (const segment of segments) {
    const nameValue = segment.split(';')[0].trim();
    if (
      nameValue.startsWith('authjs.session-token=') ||
      nameValue.startsWith('__Secure-authjs.session-token=')
    ) {
      return nameValue.slice(nameValue.indexOf('=') + 1);
    }
  }
  return null;
}

export function extractCsrfCookie(setCookieHeader: string): string {
  const segments = setCookieHeader.split(',');
  let lastCsrf = '';
  for (const segment of segments) {
    const nameValue = segment.split(';')[0].trim();
    if (
      nameValue.startsWith('authjs.csrf-token=') ||
      nameValue.startsWith('__Host-authjs.csrf-token=')
    ) {
      lastCsrf = nameValue;
    }
  }
  return lastCsrf;
}

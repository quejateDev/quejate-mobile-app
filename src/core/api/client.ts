import axios from 'axios';
import { SecureStorage } from '@core/auth/SecureStorage';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    skipAuth401?: boolean;
  }
  interface AxiosRequestConfig {
    skipAuth401?: boolean;
  }
}

const RESOLVED_API_URL = process.env.EXPO_PUBLIC_API_URL;

export const apiClient = axios.create({
  baseURL: RESOLVED_API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStorage.getSessionToken();
  if (token) {
    // Backend mobile contract: currentUser() reads `Authorization: Bearer <jwe>`
    // via decode(). Do NOT replicate the __Secure- session cookie — its prefix
    // rules can't be satisfied from a manually-set header and auth() rejects it.
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    if (status === 401 && !error.config?.skipAuth401) {
      await SecureStorage.removeSessionToken();
      sessionExpiredHandler?.();
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

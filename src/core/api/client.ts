import axios from 'axios';
import { SecureStorage, SESSION_TOKEN_KEY } from '@core/auth/SecureStorage';
import { debugLog, maskToken } from '@core/debug/debugStore';

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

debugLog(
  'info',
  `env: API_URL=${RESOLVED_API_URL ?? '<UNDEFINED>'} cookieKey=${SESSION_TOKEN_KEY}`,
);

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
  const method = (config.method ?? 'get').toUpperCase();
  const url = `${config.baseURL ?? ''}${config.url ?? ''}`;
  debugLog(
    'req',
    `${method} ${url} auth=${token ? 'Bearer' : 'NONE'} tok=${maskToken(token)}`,
  );
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const method = (response.config.method ?? 'get').toUpperCase();
    debugLog('res', `${response.status} ${method} ${response.config.url ?? ''}`);
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const method = (error.config?.method ?? 'get').toUpperCase();
    const url = error.config?.url ?? '';
    let bodyPreview = '';
    try {
      const data = error.response?.data;
      bodyPreview =
        typeof data === 'string' ? data : JSON.stringify(data ?? {});
    } catch {
      bodyPreview = '<unserializable body>';
    }
    debugLog(
      'err',
      `${status ?? 'NETWORK'} ${method} ${url} skipAuth401=${!!error.config
        ?.skipAuth401} :: ${bodyPreview.slice(0, 240)} :: ${error.message ?? ''}`,
    );
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

import * as SecureStore from 'expo-secure-store';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
export const SESSION_TOKEN_KEY = apiUrl.startsWith('https://')
  ? '__Secure-authjs.session-token'
  : 'authjs.session-token';

export const SecureStorage = {
  getSessionToken: (): Promise<string | null> => SecureStore.getItemAsync(SESSION_TOKEN_KEY),
  setSessionToken: (token: string): Promise<void> => SecureStore.setItemAsync(SESSION_TOKEN_KEY, token),
  removeSessionToken: (): Promise<void> => SecureStore.deleteItemAsync(SESSION_TOKEN_KEY),
};

import * as SecureStore from 'expo-secure-store';

export const SESSION_TOKEN_KEY = __DEV__
  ? 'next-auth.session-token'
  : '__Secure-next-auth.session-token';

export const SecureStorage = {
  getSessionToken: (): Promise<string | null> => SecureStore.getItemAsync(SESSION_TOKEN_KEY),
  setSessionToken: (token: string): Promise<void> => SecureStore.setItemAsync(SESSION_TOKEN_KEY, token),
  removeSessionToken: (): Promise<void> => SecureStore.deleteItemAsync(SESSION_TOKEN_KEY),
};

import { useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '@core/auth/useAuth';

WebBrowser.maybeCompleteAuthSession();

const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// TODO (semana de build): Google Sign-In no funciona en Expo Go con SDK 54 porque
// el proxy auth.expo.io fue retirado y Google rechaza exp:// como redirect URI.
// Para la build de producción (Android e iOS):
//   1. Crear OAuth client Android en Google Cloud Console (requiere SHA-1 del keystore EAS)
//   2. Crear OAuth client iOS en Google Cloud Console (requiere Bundle ID definitivo)
//   3. Agregar EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID y EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID al .env
//   4. Cambiar redirectUri a AuthSession.makeRedirectUri({ scheme: 'quejate' })
//      que en builds nativos sí es aceptado por Google como URI nativo registrado.

const isExpoGo = Constants.appOwnership === 'expo';

function resolveClientId() {
  if (Platform.OS === 'ios' && IOS_CLIENT_ID) return IOS_CLIENT_ID;
  if (Platform.OS === 'android' && ANDROID_CLIENT_ID) return ANDROID_CLIENT_ID;
  return WEB_CLIENT_ID;
}

const CLIENT_ID = resolveClientId();

const redirectUri = isExpoGo
  ? 'https://auth.expo.io/@quejateapp/quejate-app'
  : AuthSession.makeRedirectUri({ scheme: 'quejate' });

export function useGoogleAuth() {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: CLIENT_ID ?? '',
    webClientId: WEB_CLIENT_ID ?? '',
    redirectUri,
  });

  useEffect(() => {
    if (response?.type !== 'success') return;

    const idToken = response.params?.id_token;
    if (!idToken) {
      setError('No se pudo obtener el token de Google');
      return;
    }

    setIsLoading(true);
    setError(null);
    signInWithGoogle(idToken)
      .catch(() => setError('Error al iniciar sesión con Google. Intenta de nuevo'))
      .finally(() => setIsLoading(false));
  }, [response]);

  const signIn = async () => {
    if (!CLIENT_ID) {
      setError('Google sign-in no está configurado aún');
      return;
    }
    setError(null);
    await promptAsync();
  };

  return {
    signIn,
    isLoading,
    error,
    isAvailable: !!CLIENT_ID,
    isReady: !!request,
  };
}

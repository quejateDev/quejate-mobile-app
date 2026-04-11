import { useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@core/auth/useAuth';

WebBrowser.maybeCompleteAuthSession();

const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

const isNativeFlowConfigured = !!(IOS_CLIENT_ID || ANDROID_CLIENT_ID);

export function useGoogleAuth() {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: IOS_CLIENT_ID ?? '',
    androidClientId: ANDROID_CLIENT_ID ?? '',
    webClientId: WEB_CLIENT_ID ?? '',
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
    if (!isNativeFlowConfigured) {
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
    isAvailable: isNativeFlowConfigured,
    isReady: !!request,
  };
}

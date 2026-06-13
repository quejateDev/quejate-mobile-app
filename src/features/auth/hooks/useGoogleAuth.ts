import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuth } from '@core/auth/useAuth';

// El sign-in nativo necesita el WEB client ID para emitir un idToken con
// aud = Web Client ID, que es lo que el backend (/auth/mobile/google) verifica.
// El client de Android se resuelve por package + SHA-1 vía google-services.json.
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const HAS_CLIENT = !!WEB_CLIENT_ID;

export function useGoogleAuth() {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configuredRef = useRef(false);

  // Configuración única. La envolvemos en try/catch por si el módulo nativo no
  // está presente (p. ej. corriendo en un entorno sin el build nativo).
  useEffect(() => {
    if (configuredRef.current || !HAS_CLIENT) return;
    try {
      GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
      configuredRef.current = true;
    } catch {
      // módulo nativo no presente: el botón quedará deshabilitado en runtime
    }
  }, []);

  const signIn = useCallback(async () => {
    if (!HAS_CLIENT) {
      setError('Google sign-in no está disponible en este momento');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        // type === 'cancelled': el usuario cerró el diálogo. Sin UI de error.
        return;
      }

      const idToken = response.data.idToken;
      if (!idToken) {
        setError('No se pudo obtener el token de Google');
        return;
      }

      await signInWithGoogle(idToken);
    } catch (e) {
      if (isErrorWithCode(e)) {
        if (e.code === statusCodes.SIGN_IN_CANCELLED) return;
        if (e.code === statusCodes.IN_PROGRESS) return;
        if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setError('Google Play Services no está disponible o desactualizado.');
          return;
        }
      }
      setError('Error al iniciar sesión con Google. Intenta de nuevo');
    } finally {
      setIsLoading(false);
    }
  }, [signInWithGoogle]);

  return {
    signIn,
    isLoading,
    error,
    isAvailable: HAS_CLIENT,
    isReady: HAS_CLIENT,
  };
}

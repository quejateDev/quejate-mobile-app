import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useQueryClient } from '@tanstack/react-query';
import { navigationRef } from '@navigation/navigationRef';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import {
  setPushRegistrationStatus,
  type PushRegistrationStatus,
} from './pushRegistrationStatus';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Android 8+ will not display any notification without a channel, even when
// the push is delivered correctly.
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563EB',
  });
}

function getProjectId(): string | undefined {
  return (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
    ?.projectId;
}

/**
 * Registra este teléfono para recibir avisos.
 *
 * 🔴 **Sigue siendo best-effort —nunca lanza— pero ya no es mudo.** Tenía
 * cuatro salidas silenciosas, y eso convirtió un fallo sencillo en un misterio
 * de meses: las notificaciones llegaban a la app pero el teléfono no sonaba, y
 * ni la app ni el backend podían decir en qué paso se paraba. Ahora cada salida
 * publica su motivo en {@link setPushRegistrationStatus}, que la pantalla de
 * Perfil enseña, y lo escribe en la consola para quien mire con `adb logcat`.
 */
async function registerForPushNotifications(): Promise<void> {
  try {
    await ensureAndroidChannel();

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      report({ state: 'failed', reason: 'permission-denied', detail: status });
      return;
    }

    const projectId = getProjectId();
    if (!projectId) {
      // Llega de `extra.eas.projectId`, que se congela al compilar: si falta,
      // es que este binario se construyó sin él.
      report({ state: 'failed', reason: 'missing-project-id' });
      return;
    }

    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId }).catch(
      (error: unknown) => {
        report({
          state: 'failed',
          reason: 'token-unavailable',
          detail: messageOf(error),
        });
        return null;
      },
    );
    if (!tokenResult) return;

    try {
      await apiClient.post(
        ENDPOINTS.PUSH_TOKEN,
        { token: tokenResult.data },
        { skipAuth401: true },
      );
      report({ state: 'registered' });
    } catch (error) {
      // Se reintenta en el próximo arranque, como antes; la diferencia es que
      // ahora se sabe que hubo que reintentar.
      report({
        state: 'failed',
        reason: 'backend-rejected',
        detail: messageOf(error),
      });
    }
  } catch (error) {
    report({
      state: 'failed',
      reason: 'token-unavailable',
      detail: messageOf(error),
    });
  }
}

/** Publica el estado y deja rastro en la consola del dispositivo. */
function report(next: PushRegistrationStatus): void {
  setPushRegistrationStatus(next);
  if (next.state === 'failed') {
    console.warn(
      `[push] registro no completado: ${next.reason}${
        next.detail ? ` (${next.detail})` : ''
      }`,
    );
  }
}

/** Mensaje de un error desconocido, sin arriesgar un `undefined` en el log. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'error desconocido';
}

export function usePushNotifications(): void {
  const queryClient = useQueryClient();
  const receivedSub = useRef<Notifications.EventSubscription | null>(null);
  const responseSub = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotifications();

    receivedSub.current = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    responseSub.current = Notifications.addNotificationResponseReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (!navigationRef.isReady()) return;
      navigationRef.navigate('Notificaciones');
    });

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, [queryClient]);
}

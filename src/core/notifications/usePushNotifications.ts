import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useQueryClient } from '@tanstack/react-query';
import { navigationRef } from '@navigation/navigationRef';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { debugLog } from '@core/debug/debugStore';
import { getErrorStatus } from '@shared/utils/httpError';

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

async function registerForPushNotifications(): Promise<void> {
  try {
    await ensureAndroidChannel();

    const { status } = await Notifications.requestPermissionsAsync();
    debugLog('info', `PUSH permiso=${status}`);
    if (status !== 'granted') return;

    const projectId = getProjectId();
    if (!projectId) {
      debugLog('err', 'PUSH sin projectId en expoConfig.extra.eas');
      return;
    }

    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId }).catch((err) => {
      debugLog('err', `PUSH getExpoPushToken FALLÓ: ${err?.message ?? err}`);
      return null;
    });
    if (!tokenResult) return;
    debugLog('info', `PUSH token=${tokenResult.data.slice(0, 24)}…`);

    try {
      const r = await apiClient.post(
        ENDPOINTS.PUSH_TOKEN,
        { token: tokenResult.data },
        { skipAuth401: true },
      );
      debugLog('info', `PUSH POST token -> ${r.status}`);
    } catch (e) {
      const status = getErrorStatus(e);
      debugLog('err', `PUSH POST token FALLÓ status=${status ?? 'NET'}`);
    }
  } catch (e) {
    debugLog('err', `PUSH registro error: ${(e as Error)?.message ?? String(e)}`);
  }
}

export function usePushNotifications(): void {
  const queryClient = useQueryClient();
  const receivedSub = useRef<Notifications.EventSubscription | null>(null);
  const responseSub = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotifications();

    receivedSub.current = Notifications.addNotificationReceivedListener(() => {
      debugLog('info', 'PUSH recibida (foreground)');
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

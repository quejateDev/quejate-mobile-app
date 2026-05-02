import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useQueryClient } from '@tanstack/react-query';
import { navigationRef } from '@navigation/navigationRef';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
    ?.eas?.projectId;
  if (!projectId) {
    console.warn('[PushNotifications] projectId no encontrado en app.json extra.eas.projectId');
    return;
  }

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId }).catch((err) => {
    console.warn('[PushNotifications] Error obteniendo token:', err);
    return null;
  });
  if (!tokenResult) return;

  const token = tokenResult.data;
  await apiClient.post(ENDPOINTS.PUSH_TOKEN, { token }).catch((err) => {
    console.warn('[PushNotifications] Error guardando token:', err);
  });
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
      if (!navigationRef.isReady()) return;
      navigationRef.navigate('Tabs', { screen: 'Notificaciones' });
    });

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, [queryClient]);
}

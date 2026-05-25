import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from '@navigation/navigationRef';
import type { AppStackParamList } from '@navigation/navigationRef';
import CreatePQRScreen from '@features/pqr/screens/CreatePQRScreen';
import PQRDetailScreen from '@features/pqr/screens/PQRDetailScreen';
import NotificationsScreen from '@features/notifications/screens/NotificationsScreen';
import PublicProfileScreen from '@features/users/screens/PublicProfileScreen';
import FormalFollowupScreen from '@features/pqr/screens/FormalFollowupScreen';
import GenerateTutelaScreen from '@features/pqr/screens/GenerateTutelaScreen';
import LawyerListScreen from '@features/lawyers/screens/LawyerListScreen';
import LawyerDetailScreen from '@features/lawyers/screens/LawyerDetailScreen';
import MyLawyerRequestsScreen from '@features/lawyers/screens/MyLawyerRequestsScreen';
import RegisterAsLawyerScreen from '@features/lawyers/screens/RegisterAsLawyerScreen';
import MapScreen from '@features/map/screens/MapScreen';
import { AppTabNavigator } from '@navigation/AppTabNavigator';
import { withErrorBoundary } from '@shared/components/ui/withErrorBoundary';

const Stack = createNativeStackNavigator<AppStackParamList>();

const headerDefaults = {
  headerShown: true,
  headerBackTitle: 'Volver',
  headerTintColor: '#2563EB',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: '#fff' },
} as const;

function parseDeepLink(url: string | null): void {
  if (!url || url.includes('expo-development-client')) return;
  const match = url.match(/quejate:\/\/pqr\/([^/?#]+)/);
  if (match?.[1] && navigationRef.isReady()) {
    navigationRef.navigate('PQRDetail', { id: match[1] });
  }
}

export default function AppNavigator() {
  useEffect(() => {
    Linking.getInitialURL().then(parseDeepLink);
    const sub = Linking.addEventListener('url', ({ url }) => parseDeepLink(url));
    return () => sub.remove();
  }, []);

  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={AppTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="CreatePQR" component={withErrorBoundary(CreatePQRScreen)} options={{ ...headerDefaults, headerTitle: 'Nueva PQRSD' }} />
      <Stack.Screen name="PQRDetail" component={withErrorBoundary(PQRDetailScreen)} options={{ ...headerDefaults, headerTitle: 'Detalle PQRSD' }} />
      <Stack.Screen name="Notificaciones" component={withErrorBoundary(NotificationsScreen)} options={{ headerShown: false }} />
      <Stack.Screen name="PublicProfile" component={withErrorBoundary(PublicProfileScreen)} options={{ ...headerDefaults, headerTitle: 'Perfil' }} />
      <Stack.Screen name="FormalFollowup" component={withErrorBoundary(FormalFollowupScreen)} options={{ ...headerDefaults, headerTitle: 'Seguimiento formal' }} />
      <Stack.Screen name="GenerateTutela" component={withErrorBoundary(GenerateTutelaScreen)} options={{ ...headerDefaults, headerTitle: 'Generar tutela' }} />
      <Stack.Screen name="LawyerList" component={withErrorBoundary(LawyerListScreen)} options={{ ...headerDefaults, headerTitle: 'Abogados disponibles' }} />
      <Stack.Screen name="LawyerDetail" component={withErrorBoundary(LawyerDetailScreen)} options={{ ...headerDefaults, headerTitle: 'Perfil de abogado' }} />
      <Stack.Screen name="MyLawyerRequests" component={withErrorBoundary(MyLawyerRequestsScreen)} options={{ ...headerDefaults, headerTitle: 'Mis solicitudes' }} />
      <Stack.Screen name="RegisterAsLawyer" component={withErrorBoundary(RegisterAsLawyerScreen)} options={{ ...headerDefaults, headerTitle: 'Registro como abogado' }} />
      <Stack.Screen name="MapaCiudadano" component={withErrorBoundary(MapScreen)} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

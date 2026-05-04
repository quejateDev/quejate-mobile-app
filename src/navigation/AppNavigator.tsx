import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from '@navigation/navigationRef';
import type { AppStackParamList } from '@navigation/navigationRef';
import CreatePQRScreen from '@features/pqr/screens/CreatePQRScreen';
import PQRDetailScreen from '@features/pqr/screens/PQRDetailScreen';
import MyPQRsScreen from '@features/pqr/screens/MyPQRsScreen';
import PublicProfileScreen from '@features/users/screens/PublicProfileScreen';
import LawyerDetailScreen from '@features/lawyers/screens/LawyerDetailScreen';
import MyLawyerRequestsScreen from '@features/lawyers/screens/MyLawyerRequestsScreen';
import RegisterAsLawyerScreen from '@features/lawyers/screens/RegisterAsLawyerScreen';
import { AppTabNavigator } from '@navigation/AppTabNavigator';

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
      <Stack.Screen name="CreatePQR" component={CreatePQRScreen} options={{ ...headerDefaults, headerTitle: 'Nueva PQRSD' }} />
      <Stack.Screen name="PQRDetail" component={PQRDetailScreen} options={{ ...headerDefaults, headerTitle: 'Detalle PQRSD' }} />
      <Stack.Screen name="MyPQRs" component={MyPQRsScreen} options={{ ...headerDefaults, headerTitle: 'Mis PQRSDs' }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={{ ...headerDefaults, headerTitle: 'Perfil' }} />
      <Stack.Screen name="LawyerDetail" component={LawyerDetailScreen} options={{ ...headerDefaults, headerTitle: 'Perfil de abogado' }} />
      <Stack.Screen name="MyLawyerRequests" component={MyLawyerRequestsScreen} options={{ ...headerDefaults, headerTitle: 'Mis solicitudes' }} />
      <Stack.Screen name="RegisterAsLawyer" component={RegisterAsLawyerScreen} options={{ ...headerDefaults, headerTitle: 'Registro como abogado' }} />
    </Stack.Navigator>
  );
}

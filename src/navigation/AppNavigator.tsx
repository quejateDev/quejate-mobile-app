import React, { useEffect } from 'react';
import { Image, Linking, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { navigationRef } from '@navigation/navigationRef';
import type { AppStackParamList, AppTabParamList } from '@navigation/navigationRef';
import PQRListScreen from '@features/pqr/screens/PQRListScreen';
import CreatePQRScreen from '@features/pqr/screens/CreatePQRScreen';
import PQRDetailScreen from '@features/pqr/screens/PQRDetailScreen';
import MyPQRsScreen from '@features/pqr/screens/MyPQRsScreen';
import NotificationsScreen from '@features/notifications/screens/NotificationsScreen';
import PublicProfileScreen from '@features/users/screens/PublicProfileScreen';
import UserProfileScreen from '@features/users/screens/UserProfileScreen';
import LawyerListScreen from '@features/lawyers/screens/LawyerListScreen';
import LawyerDetailScreen from '@features/lawyers/screens/LawyerDetailScreen';
import MyLawyerRequestsScreen from '@features/lawyers/screens/MyLawyerRequestsScreen';
import RegisterAsLawyerScreen from '@features/lawyers/screens/RegisterAsLawyerScreen';
import MapScreen from '@features/map/screens/MapScreen';
import { useNotifications } from '@features/notifications/hooks/useNotifications';
import { usePushNotifications } from '@core/notifications/usePushNotifications';

function PersonIcon({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ alignItems: 'center', width: size, height: size, justifyContent: 'flex-end' }}>
      <View
        style={{
          width: size * 0.42,
          height: size * 0.42,
          borderRadius: size * 0.21,
          backgroundColor: color,
          marginBottom: size * 0.04,
        }}
      />
      <View
        style={{
          width: size * 0.72,
          height: size * 0.38,
          borderTopLeftRadius: size * 0.36,
          borderTopRightRadius: size * 0.36,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function MapPinIcon({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.6,
          height: size * 0.6,
          borderRadius: size * 0.3,
          borderWidth: size * 0.12,
          borderColor: color,
          backgroundColor: 'transparent',
        }}
      />
      <View
        style={{
          width: size * 0.12,
          height: size * 0.28,
          backgroundColor: color,
          marginTop: -size * 0.04,
          borderBottomLeftRadius: size * 0.06,
          borderBottomRightRadius: size * 0.06,
        }}
      />
    </View>
  );
}

function BriefcaseIcon({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.78,
          height: size * 0.58,
          borderRadius: size * 0.1,
          borderWidth: size * 0.1,
          borderColor: color,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: -size * 0.22,
            width: size * 0.4,
            height: size * 0.18,
            borderTopLeftRadius: size * 0.06,
            borderTopRightRadius: size * 0.06,
            borderWidth: size * 0.1,
            borderColor: color,
            borderBottomWidth: 0,
          }}
        />
        <View
          style={{
            width: '100%',
            height: size * 0.1,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

const Tab = createBottomTabNavigator<AppTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function AppTabs() {
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  usePushNotifications();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'PQRSDs') {
            return (
              <Image
                source={require('../../assets/comunidad.png')}
                style={{ width: size, height: size, tintColor: color }}
                resizeMode="contain"
              />
            );
          }
          if (route.name === 'Notificaciones') {
            return (
              <Image
                source={require('../../assets/mensajes.png')}
                style={{ width: size, height: size, tintColor: color }}
                resizeMode="contain"
              />
            );
          }
          if (route.name === 'Mapa') {
            return <MapPinIcon color={color} size={size} />;
          }
          if (route.name === 'Abogados') {
            return <BriefcaseIcon color={color} size={size} />;
          }
          return <PersonIcon color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="PQRSDs" component={PQRListScreen} />
      <Tab.Screen
        name="Notificaciones"
        component={NotificationsScreen}
        options={{ tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
      <Tab.Screen name="Mapa" component={MapScreen} />
      <Tab.Screen name="Abogados" component={LawyerListScreen} />
      <Tab.Screen name="Perfil" component={UserProfileScreen} />
    </Tab.Navigator>
  );
}

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
      <Stack.Screen
        name="Tabs"
        component={AppTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreatePQR"
        component={CreatePQRScreen}
        options={{
          headerShown: true,
          headerTitle: 'Nueva PQRSD',
          headerBackTitle: 'Volver',
          headerTintColor: '#2563EB',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#fff' },
        }}
      />
      <Stack.Screen
        name="PQRDetail"
        component={PQRDetailScreen}
        options={{
          headerShown: true,
          headerTitle: 'Detalle PQRSD',
          headerBackTitle: 'Volver',
          headerTintColor: '#2563EB',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#fff' },
        }}
      />
      <Stack.Screen
        name="MyPQRs"
        component={MyPQRsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Mis PQRSDs',
          headerBackTitle: 'Volver',
          headerTintColor: '#2563EB',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#fff' },
        }}
      />
      <Stack.Screen
        name="PublicProfile"
        component={PublicProfileScreen}
        options={{
          headerShown: true,
          headerTitle: 'Perfil',
          headerBackTitle: 'Volver',
          headerTintColor: '#2563EB',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#fff' },
        }}
      />
      <Stack.Screen
        name="LawyerDetail"
        component={LawyerDetailScreen}
        options={{
          headerShown: true,
          headerTitle: 'Perfil de abogado',
          headerBackTitle: 'Volver',
          headerTintColor: '#2563EB',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#fff' },
        }}
      />
      <Stack.Screen
        name="MyLawyerRequests"
        component={MyLawyerRequestsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Mis solicitudes',
          headerBackTitle: 'Volver',
          headerTintColor: '#2563EB',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#fff' },
        }}
      />
      <Stack.Screen
        name="RegisterAsLawyer"
        component={RegisterAsLawyerScreen}
        options={{
          headerShown: true,
          headerTitle: 'Registro como abogado',
          headerBackTitle: 'Volver',
          headerTintColor: '#2563EB',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#fff' },
        }}
      />
    </Stack.Navigator>
  );
}

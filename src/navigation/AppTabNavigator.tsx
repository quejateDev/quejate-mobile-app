import React from 'react';
import { Image, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { AppTabParamList } from '@navigation/navigationRef';
import PQRListScreen from '@features/pqr/screens/PQRListScreen';
import NotificationsScreen from '@features/notifications/screens/NotificationsScreen';
import MapScreen from '@features/map/screens/MapScreen';
import LawyerListScreen from '@features/lawyers/screens/LawyerListScreen';
import UserProfileScreen from '@features/users/screens/UserProfileScreen';
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
        <View style={{ width: '100%', height: size * 0.1, backgroundColor: color }} />
      </View>
    </View>
  );
}

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabNavigator() {
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
          if (route.name === 'Mapa') return <MapPinIcon color={color} size={size} />;
          if (route.name === 'Abogados') return <BriefcaseIcon color={color} size={size} />;
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

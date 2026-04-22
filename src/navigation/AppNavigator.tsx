import React from 'react';
import { Image, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import PQRListScreen from '@features/pqr/screens/PQRListScreen';
import CreatePQRScreen from '@features/pqr/screens/CreatePQRScreen';
import PQRDetailScreen from '@features/pqr/screens/PQRDetailScreen';
import MyPQRsScreen from '@features/pqr/screens/MyPQRsScreen';
import NotificationsScreen from '@features/notifications/screens/NotificationsScreen';
import UserProfileScreen from '@features/users/screens/UserProfileScreen';

// ---------------------------------------------------------------------------
// Param lists
// ---------------------------------------------------------------------------

type AppTabParamList = {
  PQRSDs: undefined;
  Notificaciones: undefined;
  Perfil: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  CreatePQR: undefined;
  PQRDetail: { id: string };
  MyPQRs: undefined;
};

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

const Tab = createBottomTabNavigator<AppTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function AppTabs() {
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
          return <PersonIcon color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="PQRSDs" component={PQRListScreen} />
      <Tab.Screen name="Notificaciones" component={NotificationsScreen} />
      <Tab.Screen name="Perfil" component={UserProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
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
    </Stack.Navigator>
  );
}

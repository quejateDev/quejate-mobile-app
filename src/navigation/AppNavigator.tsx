import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import PQRListScreen from '@features/pqr/screens/PQRListScreen';
import CreatePQRScreen from '@features/pqr/screens/CreatePQRScreen';
import NotificationsScreen from '@features/notifications/screens/NotificationsScreen';
import UserProfileScreen from '@features/users/screens/UserProfileScreen';

// ---------------------------------------------------------------------------
// Param lists
// ---------------------------------------------------------------------------

type AppTabParamList = {
  PQRs: undefined;
  Notificaciones: undefined;
  Perfil: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  CreatePQR: undefined;
};

// ---------------------------------------------------------------------------
// Navigators
// ---------------------------------------------------------------------------

const Tab = createBottomTabNavigator<AppTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="PQRs" component={PQRListScreen} />
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
    </Stack.Navigator>
  );
}

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import PQRListScreen from '@features/pqr/screens/PQRListScreen';
import NotificationsScreen from '@features/notifications/screens/NotificationsScreen';
import UserProfileScreen from '@features/users/screens/UserProfileScreen';

export type AppTabParamList = {
  PQRs: undefined;
  Notificaciones: undefined;
  Perfil: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function AppNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="PQRs" component={PQRListScreen} />
      <Tab.Screen name="Notificaciones" component={NotificationsScreen} />
      <Tab.Screen name="Perfil" component={UserProfileScreen} />
    </Tab.Navigator>
  );
}
